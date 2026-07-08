const fs = require('fs');

const file = 'src/pages/owner/DashboardPage.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Replace the "Payment Methods" block with "Payment Methods Bar Chart"
const oldPaymentBlock = `{/* Payment Methods */}
          <div className="card">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-primary-500" /> Tushum to'lov turlari bo'yicha
            </h3>
            <div className="space-y-4">
              {data?.paymentMethods?.map(pm => (
                <div key={pm.paymentMethod} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-medium text-slate-800 capitalize">{pm.paymentMethod}</span>
                  <span className="font-bold text-emerald-600">{pm._sum.paidAmount?.toLocaleString() || 0} so'm</span>
                </div>
              ))}
              {(!data?.paymentMethods || data.paymentMethods.length === 0) && (
                <p className="text-slate-600 text-center py-4">Ma'lumot yo'q</p>
              )}
            </div>
          </div>`;

const newPaymentBlock = `{/* Payment Methods Bar Chart */}
          <div className="card">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-primary-500" /> To'lov turlari bo'yicha tushum
            </h3>
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.paymentStats || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 500}} tickFormatter={(v) => \`\${(v / 1000000).toFixed(1)}M\`} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(v) => [\`\${v.toLocaleString()} so'm\`, 'Summa']}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {data?.paymentStats?.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={['#10b981', '#3b82f6', '#8b5cf6'][index % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>`;

code = code.replace(oldPaymentBlock, newPaymentBlock);

// 2. Insert Occupancy Line Chart after the Expenses Category (before "Top 5 Admins")
const occupancyBlock = `

      {/* Occupancy Line Chart */}
      {['owner', 'supervisor', 'director'].includes(user?.role) && data?.occupancyStats?.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" /> Xonalar bandligi dinamikasi
          </h3>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.occupancyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v) => [\`\${v} ta xona\`, 'Band xonalar']}
                />
                <Area type="monotone" dataKey="band" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorBand)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top 5 Admins */}`;

code = code.replace('{/* Top 5 Admins */}', occupancyBlock);

// 3. Replace "Branch comparison (owner only)" to the new "Branch Stats Table"
const oldBranchStart = `{/* Branch comparison (owner only) */}`;
const oldBranchEnd = `        </div>
      )}`;

const p3 = code.indexOf(oldBranchStart);
if (p3 !== -1) {
  // find the end of this block which is before {/* Monthly Shifts */}
  const p4 = code.indexOf(`{/* Monthly Shifts */}`);
  if (p4 !== -1) {
     const branchBlockOld = code.substring(p3, p4);
     
     const branchBlockNew = \`{/* Branch Stats Table (owner, supervisor, director) */}
      {['owner', 'supervisor', 'director'].includes(user?.role) && data?.branchStats && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 size={20} className="text-primary-500" /> Filiallar bo'yicha oylik hisobot
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th text-left">Filial</th>
                  <th className="table-th text-right">Jami tushum</th>
                  <th className="table-th text-right">Qo'sh. xizmatlar</th>
                  <th className="table-th text-right">Terminal</th>
                  <th className="table-th text-right">QrCode</th>
                  <th className="table-th text-right text-red-500">Xarajatlar</th>
                  <th className="table-th text-right font-bold text-emerald-600">Qoldiq</th>
                </tr>
              </thead>
              <tbody>
                {data.branchStats.map((bs, idx) => (
                  <tr key={bs.branch.id} className="table-row hover:bg-slate-50 transition-colors">
                    <td className="table-td font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        {bs.branch.name}
                      </div>
                    </td>
                    <td className="table-td text-right font-bold text-slate-900">
                      {(bs.totalIncome || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">so'm</span>
                    </td>
                    <td className="table-td text-right text-slate-600">
                      {(bs.additionalServices || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-right text-slate-600">
                      {(bs.terminal || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-right text-slate-600">
                      {(bs.qrcode || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-right font-medium text-red-500">
                      {(bs.totalExpenses || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-right font-bold text-emerald-600 bg-emerald-50/50">
                      {(bs.balance || 0).toLocaleString()} <span className="text-xs font-normal text-emerald-600/70">so'm</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      \`;

     code = code.replace(branchBlockOld, branchBlockNew);
  }
}

fs.writeFileSync(file, code, 'utf8');
console.log('DashboardPage.jsx successfully updated.');
