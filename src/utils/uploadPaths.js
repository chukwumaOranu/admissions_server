const path = require('path');

const serverRoot = path.resolve(__dirname, '../..');
const configuredUploadPath = process.env.UPLOAD_PATH || './uploads';
const uploadRoot = path.isAbsolute(configuredUploadPath)
  ? configuredUploadPath
  : path.resolve(serverRoot, configuredUploadPath);

const uploadPath = (...segments) => path.join(uploadRoot, ...segments);

const localPathFromUploadUrl = (uploadUrl) => {
  const relativePath = String(uploadUrl || '')
    .replace(/^\/+/, '')
    .replace(/^uploads\/?/, '');
  return uploadPath(relativePath);
};

module.exports = {
  uploadRoot,
  uploadPath,
  localPathFromUploadUrl
};
