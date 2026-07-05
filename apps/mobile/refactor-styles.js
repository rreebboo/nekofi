const fs = require('fs');
const path = require('path');

const targetDirs = ['src/components', 'src/app'];

const getFiles = (dir, filesList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, filesList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      filesList.push(filePath);
    }
  }
  return filesList;
};

let allFiles = [];
targetDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    allFiles = allFiles.concat(getFiles(fullPath));
  }
});

const moderateScaleProps = [
  'fontSize', 'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'paddingHorizontal', 'paddingVertical', 'margin', 'marginTop', 'marginBottom',
  'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'borderRadius', 'gap'
];

const scaleProps = ['width', 'maxWidth', 'minWidth'];
const verticalScaleProps = ['height', 'maxHeight', 'minHeight'];

let modifiedCount = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('StyleSheet.create')) return;

  let originalContent = content;

  // Add imports if not exist
  if (!content.includes('@/utils/responsive')) {
    const importStatement = `import { moderateScale, scale, verticalScale } from '@/utils/responsive';\n`;
    content = importStatement + content;
  }

  // Regex logic for each property type
  const replaceProp = (propList, scaleFunc) => {
    propList.forEach(prop => {
      // Matches prop: number. e.g., fontSize: 14 or padding: 10
      // Look for prop name, optional spaces, colon, optional spaces, and digits (maybe with decimal), not ending in string/percent
      // negative lookbehind to ensure we don't scale already scaled numbers or variables
      const regex = new RegExp(`\\b${prop}\\s*:\\s*(-?\\d+\\.?\\d*)(?!\\s*['"a-zA-Z\\(])`, 'g');
      content = content.replace(regex, (match, p1) => {
        // Skip 0 or 1, often used for borders or flex or basic padding where scale is overkill
        const num = parseFloat(p1);
        if (num === 0 || num === 1 || num === -1) return match;
        return `${prop}: ${scaleFunc}(${p1})`;
      });
    });
  };

  replaceProp(moderateScaleProps, 'moderateScale');
  replaceProp(scaleProps, 'scale');
  replaceProp(verticalScaleProps, 'verticalScale');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Modified ${file}`);
  }
});

console.log(`Refactored ${modifiedCount} files.`);
