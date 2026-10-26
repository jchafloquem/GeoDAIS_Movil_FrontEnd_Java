const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const nodeModulesPath = path.join(__dirname, 'node_modules');

if (fs.existsSync(nodeModulesPath)) {
    console.log('Buscando archivos build.gradle en node_modules para corregir ProGuard...');
    walkDir(nodeModulesPath, function(filePath) {
        if (filePath.endsWith('build.gradle')) {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes("proguard-android.txt")) {
                content = content.replace(/proguard-android\.txt/g, "proguard-android-optimize.txt");
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Parcheado: ${filePath}`);
            }
        }
    });
    console.log('¡Proceso de parcheo finalizado con éxito!');
} else {
    console.log('La carpeta node_modules no existe.');
}