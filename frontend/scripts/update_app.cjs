const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Fix setConfigRaw
content = content.replace(
  /setConfigRaw\(\{ teamName: act\.name, primaryColor: act\.primaryColor \}\);/g,
  `setConfigRaw(prev => ({ ...prev, teamName: act.name, primaryColor: act.primaryColor }));`
);

// 2. Add language and currency to settings modal
const colorSettingGrep = `<label className="form-label">Color Principal</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input type="color" className="input-field" value={configRaw.primaryColor} onChange={(e) => setConfigRaw({ ...configRaw, primaryColor: e.target.value })} style={{ height: '50px', padding: '0.2rem', cursor: 'pointer', maxWidth: '80px' }} />
                    <span style={{ color: configRaw.primaryColor, fontWeight: 'bold' }}>{configRaw.primaryColor}</span>
                  </div>
                </div>`;
const newSettings = colorSettingGrep + `

                <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <label className="form-label">{t('Idioma', config.language)}</label>
                  <select className="input-field" value={configRaw.language} onChange={(e) => setConfigRaw({ ...configRaw, language: e.target.value })}>
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('Moneda', config.language)}</label>
                  <select className="input-field" value={configRaw.currency} onChange={(e) => setConfigRaw({ ...configRaw, currency: e.target.value })}>
                    <option value="USD">USD ($)</option>
                    <option value="MXN">MXN ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="DOP">DOP (RD$)</option>
                    <option value="VES">VES (Bs.)</option>
                  </select>
                </div>`;

content = content.replace(colorSettingGrep, newSettings);

// 3. Import `t` from translations
content = content.replace(/import \{ useState, useEffect \} from 'react';/, `import { useState, useEffect } from 'react';\nimport { t } from './translations';`);

// Clean up some hardcoded $ near curly braces
content = content.replace(/>\$\$\{/g, '>${');
content = content.replace(/>\$ \$\{/g, '>${');
content = content.replace(/\-\$\$\{/g, '-${');
content = content.replace(/Pagó \$\$\{/g, 'Pagó ${');

// 4. Replace `.toFixed(2)` interpolation
// This targets strings like: `${payment.amount.toFixed(2)}` -> `${formatCurrency(payment.amount)}`
// We will replace specific known ones to avoid breaking JS.
const replacements = [
  { match: />\$\{totalIncome\.toFixed\(2\)\}</g, replace: '>{formatCurrency(totalIncome)}<' },
  { match: />\$\{totalExpenses\.toFixed\(2\)\}</g, replace: '>{formatCurrency(totalExpenses)}<' },
  { match: />\$\{balance\.toFixed\(2\)\}</g, replace: '>{formatCurrency(balance)}<' },
  { match: />\$\{filteredIncome\.toFixed\(2\)\}</g, replace: '>{formatCurrency(filteredIncome)}<' },
  { match: />\$\{filteredExpensesTotal\.toFixed\(2\)\}</g, replace: '>{formatCurrency(filteredExpensesTotal)}<' },
  { match: />\$\{filteredBalance\.toFixed\(2\)\}</g, replace: '>{formatCurrency(filteredBalance)}<' },
  { match: />\$\{payment\.amount\.toFixed\(2\)\}</g, replace: '>{formatCurrency(payment.amount)}<' },
  { match: />-\$\{expense\.amount\.toFixed\(2\)\}</g, replace: '>-{formatCurrency(expense.amount)}<' },
  { match: /Pagó \$\{payment\.amount\.toFixed\(2\)\}/g, replace: 'Pagó ${formatCurrency(payment.amount)}' },
  { match: />\$\{entry\.value\.toFixed\(2\)\}</g, replace: '>{formatCurrency(entry.value)}<' },
  { match: /\$\{tx\.amount\.toFixed\(2\)\}/g, replace: '${formatCurrency(tx.amount)}' },
  { match: /Total Ingresos: \$\$\{filteredIncome.toFixed\(2\)\}/g, replace: 'Total Ingresos: ${formatCurrency(filteredIncome)}' },
  { match: /Total Gastos: \$\$\{filteredExpensesTotal.toFixed\(2\)\}/g, replace: 'Total Gastos: ${formatCurrency(filteredExpensesTotal)}' },
  { match: /Balance Resultante: \$\$\{filteredBalance.toFixed\(2\)\}/g, replace: 'Balance Resultante: ${formatCurrency(filteredBalance)}' },
];

content = content.replace(/Total Ingresos: \$\$\{/g, 'Total Ingresos: ${');
content = content.replace(/Total Gastos: \$\$\{/g, 'Total Gastos: ${');
content = content.replace(/Balance Resultante: \$\$\{/g, 'Balance Resultante: ${');

for (const rep of replacements) {
  content = content.replace(rep.match, rep.replace);
}

// Ensure pdf exports also use the cleaned currency variable
content = content.replace(/\`\\$\$\{filteredIncome.toFixed\(2\)\}\`/g, '\\`${formatCurrency(filteredIncome)}\\`');
content = content.replace(/\`\\$\$\{filteredExpensesTotal.toFixed\(2\)\}\`/g, '\\`${formatCurrency(filteredExpensesTotal)}\\`');
content = content.replace(/\`\\$\$\{filteredBalance.toFixed\(2\)\}\`/g, '\\`${formatCurrency(filteredBalance)}\\`');
content = content.replace(/\`\\$\$\{tx.amount.toFixed\(2\)\}\`/g, '\\`${formatCurrency(tx.amount)}\\`');


fs.writeFileSync('src/App.tsx', content);
console.log("App.tsx updated successfully.");
