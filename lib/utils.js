const crypto = require('crypto');

function genId() {
  return crypto.randomBytes(8).toString('hex');
}

function formatCurrentDate() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

module.exports = {
  genId,
  formatCurrentDate
};
