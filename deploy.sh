#!/bin/bash

# Script de Deploy ZapOS para AWS (Ubuntu/Debian)
# Este script automatiza a instalação de pré-requisitos e a execução via Docker.

set -e

echo "--------------------------------------------------"
echo "🚀 Iniciando Preparação do Servidor ZapOS"
echo "--------------------------------------------------"

# 1. Verificação de Permissões
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, execute este script como root ou usando sudo."
  exit 1
fi

# 2. Atualização do Sistema
echo "📦 Atualizando pacotes do sistema..."
apt-get update && apt-get upgrade -y

# 3. Verificação de Pré-requisitos
install_docker() {
    echo "🐳 Instalando Docker..."
    apt-get install -y ca-certificates cursor-curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker instalado com sucesso."
}

if ! command -v docker &> /dev/null; then
    install_docker
else
    echo "✅ Docker já está instalado."
fi

if ! command -v git &> /dev/null; then
    echo "🛠️ Instalando Git..."
    apt-get install -y git
else
    echo "✅ Git já está instalado."
fi

# 4. Configuração do Ambiente
echo "⚙️ Configurando variáveis de ambiente..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Arquivo .env criado a partir do .env.example."
        echo "⚠️  Lembre-se de editar o .env com suas chaves reais se necessário."
    else
        echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
        echo "NODE_ENV=production" >> .env
        echo "✅ Arquivo .env gerado automaticamente."
    fi
else
    echo "✅ Arquivo .env já existe."
fi

# 5. Build e Execução via Docker
echo "🏗️  Iniciando build da imagem Docker..."
IMAGE_NAME="zap-os-app"

# Parar container antigo se existir
if [ "$(docker ps -aq -f name=$IMAGE_NAME)" ]; then
    echo "🛑 Parando container antigo..."
    docker stop $IMAGE_NAME
    docker rm $IMAGE_NAME
fi

# Build
docker build -t $IMAGE_NAME .

# Run
echo "🚀 Rodando o container..."
docker run -d \
    --name $IMAGE_NAME \
    --restart always \
    -p 80:3000 \
    --env-file .env \
    -v $(pwd)/zap_os.db:/app/zap_os.db \
    $IMAGE_NAME

echo "--------------------------------------------------"
echo "✅ Sistema ZapOS está online!"
echo "📍 Acesse via: http://$(curl -s ifconfig.me)"
echo "📡 Porta interna: 3000 | Porta externa: 80"
echo "--------------------------------------------------"
echo "Comandos úteis:"
echo " - Ver logs: docker logs -f $IMAGE_NAME"
echo " - Parar: docker stop $IMAGE_NAME"
echo " - Reiniciar: docker restart $IMAGE_NAME"
echo "--------------------------------------------------"
