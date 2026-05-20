const fs = require('fs');
let file = 'src/components/Analysis/Analysis.tsx';
let content = fs.readFileSync(file, 'utf-8');

if (!content.includes('alert(result.message')) {
content = content.replace('await exportSession(sessionId);', `const result = await exportSession(sessionId);
        if (!result.success && result.message !== 'Cancelled') {
            alert('Export failed: ' + result.message);
        } else if (result.success) {
            alert('Export successful!');
        }`);
fs.writeFileSync(file, content);
console.log('Fixed wrapper');
}
