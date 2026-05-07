const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const newCases = `      case 'Pagos':
        return (
          <PaymentsTab
            config={config}
            paymentFormData={paymentFormData}
            setPaymentFormData={setPaymentFormData}
            handlePaymentSubmit={handlePaymentSubmit}
            players={players}
            filteredPayments={filteredPayments}
            loadingPayments={loadingPayments}
            paymentConcepts={paymentConcepts}
            allConcepts={allConcepts}
            paymentSearch={paymentSearch}
            setPaymentSearch={setPaymentSearch}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            openEditModal={openEditModal}
            confirmDelete={confirmDelete}
            renderSearchBar={renderSearchBar}
          />
        );
      case 'Asistencia':
        return (
          <AttendanceTab
            config={config}
            games={games}
            paymentControlGameId={paymentControlGameId}
            setPaymentControlGameId={setPaymentControlGameId}
            players={players}
            payments={payments}
            setPayments={setPayments}
            activeTeamId={activeTeamId}
            PAYMENT_API_URL={PAYMENT_API_URL}
            mutateData={mutateData}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            handleQuickPayment={handleQuickPayment}
            setConfirmActionModal={setConfirmActionModal}
            setConfirmActionInput={setConfirmActionInput}
            confirmDelete={confirmDelete}
          />
        );
      case 'Gastos':
        return (
          <ExpensesTab
            config={config}
            expenseFormData={expenseFormData}
            setExpenseFormData={setExpenseFormData}
            handleExpenseSubmit={handleExpenseSubmit}
            expenseCategories={expenseCategories}
            allConcepts={allConcepts}
            filteredExpenses={filteredExpenses}
            loadingExpenses={loadingExpenses}
            expenseSearch={expenseSearch}
            setExpenseSearch={setExpenseSearch}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            openEditModal={openEditModal}
            confirmDelete={confirmDelete}
            renderSearchBar={renderSearchBar}
            renderDateFilter={renderDateFilter}
          />
        );
      case 'Morosidad':
        return (
          <DebtsTab
            config={config}
            payments={payments}
            setPayments={setPayments}
            players={players}
            activeTeamId={activeTeamId}
            PAYMENT_API_URL={PAYMENT_API_URL}
            saveToQueueAndStorage={saveToQueueAndStorage}
            getAuthHeaders={getAuthHeaders}
            setPaymentFormData={setPaymentFormData}
            setActiveTab={setActiveTab}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'Reportes':
        return (
          <ReportsTab
            config={config}
            payments={payments}
            expenses={expenses}
            players={players}
            reportType={reportType}
            setReportType={setReportType}
            reportPlayerFilter={reportPlayerFilter}
            setReportPlayerFilter={setReportPlayerFilter}
            chartView={chartView}
            setChartView={setChartView}
            reportSearch={reportSearch}
            setReportSearch={setReportSearch}
            allConcepts={allConcepts}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            isDateInRange={isDateInRange}
            renderSearchBar={renderSearchBar}
            renderDateFilter={renderDateFilter}
          />
        );`;

// Delete lines from 1404 (index 1403) to 2112 (index 2111)
lines.splice(1403, 2112 - 1404 + 1, newCases);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Replaced lines 1404 to 2112 successfully.');
