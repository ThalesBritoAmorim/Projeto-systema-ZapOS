import * as esbuild from 'esbuild';

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: 'dist-server/server.js',
      external: ['better-sqlite3', 'vite'], // Native modules and vite shouldn't be bundled
      banner: {
        js: `
          import { createRequire } from 'module';
          const require = createRequire(import.meta.url);
        `,
      },
    });
    console.log('✅ Server built successfully to dist-server/server.js');
  } catch (error) {
    console.error('❌ Server build failed:', error);
    process.exit(1);
  }
}

build();
