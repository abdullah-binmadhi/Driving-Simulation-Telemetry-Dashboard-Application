const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes('<ResponsiveContainer width={100} height={100}')) {
    // wait I want width="99%" height={250} because absolute 100px is too small
    content = content.replace(/<ResponsiveContainer [^>]*>/g, '<ResponsiveContainer width="99%" height={250}>');
    fs.writeFileSync(file, content);
    console.log('Fixed wrapper to 99% 250px');
  }
}
