const { executeQuery, closePool } = require('../src/configs/db.config');

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : '';
};

const execute = hasFlag('--execute');
const applicationNumber = getArgValue('--application');
const refs = getArgValue('--refs')
  .split(',')
  .map((ref) => ref.trim())
  .filter(Boolean);

const allowedStatuses = ['pending', 'failed', 'cancelled'];

const buildFilters = () => {
  const conditions = [`pt.payment_status IN (${allowedStatuses.map(() => '?').join(', ')})`];
  const params = [...allowedStatuses];

  if (applicationNumber) {
    conditions.push('a.application_number = ?');
    params.push(applicationNumber);
  }

  if (refs.length > 0) {
    conditions.push(`pt.transaction_reference IN (${refs.map(() => '?').join(', ')})`);
    params.push(...refs);
  }

  return { where: conditions.join(' AND '), params };
};

const printUsage = () => {
  console.log(`
Usage:
  node scripts/cleanup-non-success-payments.js [--application=APP20260001] [--refs=REF1,REF2] [--execute]

Default mode is dry-run. It only lists pending, failed, and cancelled payment rows.
Add --execute to delete the listed rows.

Examples:
  node scripts/cleanup-non-success-payments.js --application=APP20260001
  node scripts/cleanup-non-success-payments.js --application=APP20260001 --execute
  node scripts/cleanup-non-success-payments.js --refs=ADM123,ADM456 --execute
`);
};

const main = async () => {
  if (hasFlag('--help')) {
    printUsage();
    return;
  }

  const { where, params } = buildFilters();
  const selectSql = `
    SELECT
      pt.id,
      pt.transaction_reference,
      pt.payment_status,
      pt.amount,
      pt.created_at,
      a.application_number,
      CONCAT(a.first_name, ' ', a.last_name) AS applicant_name
    FROM payment_transactions pt
    JOIN applicants a ON pt.applicant_id = a.id
    WHERE ${where}
    ORDER BY pt.created_at DESC
  `;

  const { rows } = await executeQuery(selectSql, params);

  if (rows.length === 0) {
    console.log('No non-success payment transactions found for the selected filter.');
    return;
  }

  console.table(rows);

  if (!execute) {
    console.log(`Dry-run only. ${rows.length} row(s) would be deleted. Add --execute to delete them.`);
    return;
  }

  const deleteSql = `
    DELETE pt
    FROM payment_transactions pt
    JOIN applicants a ON pt.applicant_id = a.id
    WHERE ${where}
  `;

  const result = await executeQuery(deleteSql, params);
  console.log(`Deleted ${result.affectedRows || 0} non-success payment transaction(s).`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
