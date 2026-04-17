import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('zap_os.db');
const JWT_SECRET = process.env.JWT_SECRET || 'zap-os-secret-2024';

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS ordens_servico (
    id_os INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_os TEXT NOT NULL CHECK (tipo_os IN ('requisicao', 'incidente')),
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    possui_anexo BOOLEAN DEFAULT FALSE,
    nome_usuario TEXT NOT NULL,
    nivel_urgencia TEXT CHECK (nivel_urgencia IN ('baixa', 'media', 'alta')),
    data_execucao DATETIME NOT NULL,
    numero_whatsapp TEXT NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('em_atendimento', 'pendente', 'agendada', 'encerrada')),
    data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_fechamento DATETIME
  );

  CREATE TABLE IF NOT EXISTS historico_os (
    id_historico INTEGER PRIMARY KEY AUTOINCREMENT,
    id_os INTEGER NOT NULL,
    descricao_atualizacao TEXT NOT NULL,
    data_hora_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    tipo_atualizacao TEXT CHECK (tipo_atualizacao IN ('descricao', 'anexo_adicionado', 'status_alterado')),
    FOREIGN KEY (id_os) REFERENCES ordens_servico(id_os) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS usuarios_admin (
    id_admin INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nome_completo TEXT,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'user')),
    ativo BOOLEAN DEFAULT TRUE
  );
`);

// Create default users (superadmin / super123, admin / admin123)
const superExists = db.prepare('SELECT * FROM usuarios_admin WHERE username = ?').get('superadmin');
if (!superExists) {
  const hash = bcrypt.hashSync('super123', 10);
  db.prepare('INSERT INTO usuarios_admin (username, password_hash, nome_completo, role) VALUES (?, ?, ?, ?)')
    .run('superadmin', hash, 'Super Administrador', 'superadmin');
}

const adminExists = db.prepare('SELECT * FROM usuarios_admin WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO usuarios_admin (username, password_hash, nome_completo, role) VALUES (?, ?, ?, ?)')
    .run('admin', hash, 'Administrador do Sistema', 'admin');
}

// In-memory sessions for WhatsApp state machine simulation
const waSessions = new Map<string, any>();

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare('SELECT * FROM usuarios_admin WHERE username = ? AND ativo = 1').get(username);
    
    if (user && bcrypt.compareSync(password, user.password_hash)) {
      const token = jwt.sign({ id: user.id_admin, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token, user: { id: user.id_admin, username: user.username, nome: user.nome_completo, role: user.role } });
    }
    res.status(401).json({ error: 'Credenciais inválidas ou usuário desativado' });
  });

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  const checkRole = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Acesso negado' });
    next();
  };

  // User Management
  app.get('/api/users', authenticateToken, checkRole(['superadmin', 'admin']), (req, res) => {
    const users = db.prepare('SELECT id_admin, username, nome_completo, role, ativo FROM usuarios_admin').all();
    res.json(users);
  });

  app.post('/api/users', authenticateToken, checkRole(['superadmin', 'admin']), (req, res) => {
    const { username, password, nome_completo, role } = req.body;
    
    // Admin cannot create superadmin
    if ((req as any).user.role === 'admin' && role === 'superadmin') {
        return res.status(403).json({ error: 'Admins não podem criar superadmins' });
    }

    try {
        const hash = bcrypt.hashSync(password, 10);
        db.prepare('INSERT INTO usuarios_admin (username, password_hash, nome_completo, role) VALUES (?, ?, ?, ?)')
          .run(username, hash, nome_completo, role);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: 'Usuário já existe' });
    }
  });

  app.patch('/api/users/:id', authenticateToken, checkRole(['superadmin', 'admin']), (req, res) => {
    const { password, nome_completo, role, ativo } = req.body;
    const targetId = req.params.id;
    
    const targetUser: any = db.prepare('SELECT * FROM usuarios_admin WHERE id_admin = ?').get(targetId);
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Permissions check
    if ((req as any).user.role === 'admin') {
        if (targetUser.role === 'superadmin') return res.status(403).json({ error: 'Ação não permitida sobre superadmin' });
        if (role === 'superadmin') return res.status(403).json({ error: 'Não é possível promover a superadmin' });
    }

    if (password) {
        const hash = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE usuarios_admin SET password_hash = ? WHERE id_admin = ?').run(hash, targetId);
    }
    if (nome_completo !== undefined) db.prepare('UPDATE usuarios_admin SET nome_completo = ? WHERE id_admin = ?').run(nome_completo, targetId);
    if (role !== undefined) db.prepare('UPDATE usuarios_admin SET role = ? WHERE id_admin = ?').run(role, targetId);
    if (ativo !== undefined) db.prepare('UPDATE usuarios_admin SET ativo = ? WHERE id_admin = ?').run(ativo ? 1 : 0, targetId);

    res.json({ success: true });
  });

  app.get('/api/os', authenticateToken, (req, res) => {

    const rows = db.prepare(`
      SELECT * FROM ordens_servico 
      ORDER BY data_abertura DESC
    `).all();
    res.json(rows);
  });

  app.get('/api/os/:id', authenticateToken, (req, res) => {
    const os = db.prepare('SELECT * FROM ordens_servico WHERE id_os = ?').get(req.params.id);
    if (!os) return res.status(404).json({ error: 'OS não encontrada' });
    
    const historico = db.prepare('SELECT * FROM historico_os WHERE id_os = ? ORDER BY data_hora_atualizacao DESC').all(req.params.id);
    res.json({ ...os, historico });
  });

  app.patch('/api/os/:id', authenticateToken, (req, res) => {
    const { status, descricao_atualizacao } = req.body;
    const osId = req.params.id;

    if (status) {
      db.prepare('UPDATE ordens_servico SET status = ? WHERE id_os = ?').run(status, osId);
      db.prepare('INSERT INTO historico_os (id_os, descricao_atualizacao, tipo_atualizacao) VALUES (?, ?, ?)')
        .run(osId, `Status alterado para ${status}`, 'status_alterado');
    }

    if (descricao_atualizacao) {
      db.prepare('INSERT INTO historico_os (id_os, descricao_atualizacao, tipo_atualizacao) VALUES (?, ?, ?)')
        .run(osId, descricao_atualizacao, 'descricao');
    }

    res.json({ success: true });
  });  // Mock WhatsApp Webhook
  app.post('/api/whatsapp/webhook', (req, res) => {
    const { from, text, attachment } = req.body;
    let messageText = (text || '').toLowerCase().trim();
    
    // Check for mention @bot
    const isMentioned = messageText.includes('@bot');
    
    // Remove mention from text for cleaner processing if present
    const cleanText = messageText.replace('@bot', '').trim();
    
    let session = waSessions.get(from);

    // Initial triggers - now supports mention or direct message
    // If it's a group-like simulation (mention), we only act if mentioned. 
    // If it's a current session, we continue.
    
    const shouldStartNew = (isMentioned || !session) && (cleanText.includes('abrir nova os') || cleanText.includes('abrir os') || cleanText.includes('abrir chamado'));
    const shouldStartUpdate = (isMentioned || !session) && (cleanText.includes('atualizar status da os') || cleanText.includes('atualizar os'));

    if (shouldStartNew) {
      session = { step: 'TIPO', data: { numero_whatsapp: from } };
      waSessions.set(from, session);
      return res.json({ message: "Olá! Começando a abertura de uma nova OS. O que você precisa é uma **Requisição** ou um **Incidente**?" });
    }

    if (shouldStartUpdate) {
        const idMatch = cleanText.match(/\d+/);
        if (idMatch) {
            const osId = idMatch[0];
            const os = db.prepare('SELECT * FROM ordens_servico WHERE id_os = ?').get(osId);
            if (os) {
                session = { step: 'UPDATE_CHOICE', osId: osId };
                waSessions.set(from, session);
                return res.json({ message: `Encontrei a OS #${osId} (${os.titulo}). O que deseja fazer? \n1. Adicionar comentário/interação \n2. Mudar Status \n3. Sair` });
            } else {
                return res.json({ message: "OS não encontrada. Verifique o número digitado." });
            }
        } else {
            return res.json({ message: "Para atualizar, mencione o bot e informe o número da OS. Ex: @bot atualizar status da OS 123" });
        }
    }

    // If session exists, we process with cleanText (so @bot doesn't interfere with choices like "1" or "2")
    if (!session) {
        return res.json({ message: "Para falar comigo, utilize a menção @bot. Exemplo: '@bot abrir nova OS' ou '@bot atualizar status da OS 123'." });
    }

    const userInput = cleanText;

    // State Machine
    switch (session.step) {
      case 'TIPO':
        if (['requisicao', 'incidente'].includes(userInput)) {
          session.data.tipo_os = userInput;
          session.step = 'TITULO';
          return res.json({ message: "Perfeito. Agora, informe um título curto para o seu chamado." });
        }
        return res.json({ message: "Por favor, responda apenas 'requisição' ou 'incidente'." });

      case 'TITULO':
        session.data.titulo = text; // preserve casing for titles
        session.step = 'DESCRICAO';
        return res.json({ message: "Descreva com detalhes o que está acontecendo ou o que você solicita." });

      case 'DESCRICAO':
        session.data.descricao = text;
        session.step = 'ANEXO';
        return res.json({ message: "Você deseja enviar um anexo por aqui agora (foto ou documento)? Responda **Sim** ou **Não**." });

      case 'ANEXO':
        if (userInput === 'sim') {
          session.step = 'AGUARDA_ANEXO';
          return res.json({ message: "Pode enviar o anexo agora." });
        } else {
          session.data.possui_anexo = 0;
          session.step = 'NOME';
          return res.json({ message: "Certo. Agora, informe seu **Nome Completo** para registro." });
        }

      case 'AGUARDA_ANEXO':
        session.data.possui_anexo = 1;
        session.step = 'NOME';
        return res.json({ message: "Anexo recebido! Agora, informe seu **Nome Completo** para registro." });

      case 'NOME':
        session.data.nome_usuario = text;
        session.step = 'URGENCIA';
        return res.json({ message: "Qual a urgência desse pedido? **Baixa**, **Média** ou **Alta**?" });

      case 'URGENCIA':
        if (['baixa', 'media', 'alta'].includes(userInput)) {
          session.data.nivel_urgencia = userInput;
          session.step = 'DATA_TIPO';
          return res.json({ message: "A execução deve ser **Imediata** ou **Agendada**?" });
        }
        return res.json({ message: "Por favor, responda 'Baixa', 'Média' ou 'Alta'." });

      case 'DATA_TIPO':
        if (userInput === 'imediata') {
          session.data.data_execucao = new Date().toISOString();
          // Save and finish
          const info = db.prepare(`
            INSERT INTO ordens_servico (tipo_os, titulo, descricao, possui_anexo, nome_usuario, nivel_urgencia, data_execucao, numero_whatsapp)
            VALUES (@tipo_os, @titulo, @descricao, @possui_anexo, @nome_usuario, @nivel_urgencia, @data_execucao, @numero_whatsapp)
          `).run(session.data);
          waSessions.delete(from);
          return res.json({ message: `OS aberta com sucesso! O número do seu chamado é o **#${info.lastInsertRowid}**. Em breve daremos retorno.` });
        } else {
          session.step = 'DATA_AGENDADA';
          return res.json({ message: "Informe a data desejada no formato: **dia/mês/ano** (ex: 25/12/2024)." });
        }

      case 'DATA_AGENDADA':
        // Simple date parsing
        const dateParts = userInput.split('/');
        if (dateParts.length === 3) {
            const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            if (!isNaN(date.getTime())) {
                session.data.data_execucao = date.toISOString();
                const info = db.prepare(`
                    INSERT INTO ordens_servico (tipo_os, titulo, descricao, possui_anexo, nome_usuario, nivel_urgencia, data_execucao, numero_whatsapp, status)
                    VALUES (@tipo_os, @titulo, @descricao, @possui_anexo, @nome_usuario, @nivel_urgencia, @data_execucao, @numero_whatsapp, 'agendada')
                `).run(session.data);
                waSessions.delete(from);
                return res.json({ message: `OS agendada com sucesso! O número do seu chamado é o **#${info.lastInsertRowid}**. Obrigado!` });
            }
        }
        return res.json({ message: "Formato de data inválido. Use dia/mês/ano." });
      
      case 'UPDATE_CHOICE':
        if (userInput === '1') {
            session.step = 'UPDATE_TEXT';
            return res.json({ message: "Diga o que você deseja adicionar de informação à OS." });
        } else if (userInput === '2') {
            session.step = 'UPDATE_STATUS';
            return res.json({ message: "Para qual status deseja alterar? \n1. Em atendimento \n2. Pendente \n3. Agendada \n4. Encerrada" });
        } else {
            waSessions.delete(from);
            return res.json({ message: "Interação cancelada." });
        }
    
      case 'UPDATE_STATUS':
        const statusMap: any = { '1': 'em_atendimento', '2': 'pendente', '3': 'agendada', '4': 'encerrada' };
        const newStatus = statusMap[userInput];
        if (newStatus) {
            db.prepare('UPDATE ordens_servico SET status = ? WHERE id_os = ?').run(newStatus, session.osId);
            db.prepare('INSERT INTO historico_os (id_os, descricao_atualizacao, tipo_atualizacao) VALUES (?, ?, ?)')
              .run(session.osId, `Status alterado via WhatsApp para: ${newStatus}`, 'status_alterado');
            waSessions.delete(from);
            return res.json({ message: "Status atualizado com sucesso!" });
        }
        return res.json({ message: "Opção inválida. Escolha de 1 a 4." });

      case 'UPDATE_TEXT':
        db.prepare('INSERT INTO historico_os (id_os, descricao_atualizacao, tipo_atualizacao) VALUES (?, ?, ?)')
          .run(session.osId, text, 'descricao');
        waSessions.delete(from);
        return res.json({ message: "Nova interação registrada com sucesso nas notas da OS!" });

      default:
        return res.json({ message: "Ops, me perdi. Use '@bot abrir nova OS' para recomeçar." });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
