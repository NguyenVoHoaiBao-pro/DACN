const fs = require('fs');
const path = require('path');

function replaceHeaders(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceHeaders(fullPath);
        } else if (file.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Pattern: 
            // <Typography variant="h4" fontWeight="bold" gutterBottom>
            //   XYZ
            // </Typography>
            // <Typography variant="body1" color="text.secondary">
            //   ABC
            // </Typography>
            
            const regex = /<Typography\s+variant="h4"\s+fontWeight="bold"\s+gutterBottom>([\s\S]*?)<\/Typography>\s*<Typography\s+variant="body1"\s+color="text\.secondary">([\s\S]*?)<\/Typography>/g;
            
            content = content.replace(regex, '<Typography variant="h4" fontWeight={950} color="#1e293b" sx={{ letterSpacing: -0.5, mb: 1 }}>$1</Typography>\n            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ opacity: 0.8 }}>$2</Typography>');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

replaceHeaders('src/pages');
console.log('Done!');
