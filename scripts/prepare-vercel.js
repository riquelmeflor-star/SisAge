const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const sourceDirectory = path.join(projectRoot, 'Agendamentos');
const publicDirectory = path.join(projectRoot, 'public');

fs.mkdirSync(publicDirectory, { recursive: true });

for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const destinationPath = path.join(publicDirectory, entry.name);

    if (entry.isDirectory() && ['css', 'js'].includes(entry.name)) {
        fs.cpSync(sourcePath, destinationPath, { recursive: true });
    } else if (entry.isFile() && ['.html', '.js'].includes(path.extname(entry.name))) {
        fs.copyFileSync(sourcePath, destinationPath);
    }
}
