import { build } from 'vite';

build()
  .then(() => {
    console.log('Build completed successfully');
  })
  .catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
