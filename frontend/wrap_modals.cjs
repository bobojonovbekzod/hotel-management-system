const fs = require('fs');
const path = require('path');

const modals = [
  'src/components/ConfirmModal.jsx',
  'src/components/admin/CheckInModal.jsx',
  'src/components/admin/CheckOutModal.jsx',
  'src/components/admin/ExtendStayModal.jsx',
  'src/components/admin/ManageBookingModal.jsx',
  'src/components/admin/ReserveModal.jsx'
];

modals.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('ModalPortal')) return;

  const match = content.match(/export default function (\w+)/);
  if (!match) return;

  const componentName = match[1];

  // Remove the `export default ` from the function declaration
  content = content.replace(/export default function \w+/, `function ${componentName}`);

  // Import ModalPortal
  const relativePath = file.includes('admin') ? '../../common/ModalPortal' : './common/ModalPortal';
  content = `import ModalPortal from '${relativePath}';\n` + content;

  // Append the wrapper
  content += `\nexport default function ${componentName}Wrapper(props) {\n  return <ModalPortal><${componentName} {...props} /></ModalPortal>;\n}\n`;

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Wrapped ${componentName} in ${path.basename(file)}`);
});
