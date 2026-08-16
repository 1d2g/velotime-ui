import React, { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, AlertTriangle } from "lucide-react";
import { useToast } from "../contexts/ToastContext";

export default function ExpensesTab({ expenses, projects, apiCall, forceSync, dbUser }) {
  const { addToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    isBillable: true,
    projectId: ""
  });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiCall("/api/expenses", "POST", formData);
      setIsAdding(false);
      setFormData({
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        isBillable: true,
        projectId: ""
      });
      forceSync();
      addToast("Expense added successfully", "success");
    } catch (err) {
      addToast("Failed to add expense", "error");
    }
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    try {
      await apiCall(`/api/expenses/${id}`, "PUT", formData);
      setEditingId(null);
      forceSync();
      addToast("Expense updated successfully", "success");
    } catch (err) {
      addToast("Failed to edit expense", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await apiCall(`/api/expenses/${id}`, "DELETE");
      forceSync();
      addToast("Expense deleted", "success");
    } catch (err) {
      addToast("Failed to delete expense", "error");
    }
  };

  const startEdit = (expense) => {
    setFormData({
      amount: expense.amount,
      description: expense.description,
      date: new Date(expense.date).toISOString().split("T")[0],
      isBillable: expense.isBillable,
      projectId: expense.projectId || ""
    });
    setEditingId(expense.id);
  };

  const formatMoney = (m) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(m || 0);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#111111] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Expenses
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-2">
              Log out-of-pocket costs, materials, and other non-time expenses.
            </p>
          </div>
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({
                amount: "",
                description: "",
                date: new Date().toISOString().split("T")[0],
                isBillable: true,
                projectId: ""
              });
            }}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded font-bold shadow-sm transition-all"
          >
            <Plus size={18} />
            Log Expense
          </button>
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {isAdding ? "Log New Expense" : "Edit Expense"}
            </h2>
            <form onSubmit={(e) => (isAdding ? handleAddSubmit(e) : handleEditSubmit(e, editingId))}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. Flight to NYC, Server Costs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-1">
                    Project
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full border border-slate-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- None --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2 flex items-center gap-2 mt-2">
                  <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isBillable}
                      onChange={(e) => setFormData({ ...formData, isBillable: e.target.checked })}
                      className="w-4 h-4 text-slate-900 dark:text-slate-100 rounded focus:ring-gray-900 border-slate-300 dark:border-zinc-700"
                    />
                    Billable to Client
                  </label>
                </div>
                
                <div className="lg:col-span-3 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); setEditingId(null); }}
                    className="px-4 py-2 font-medium text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gray-900 text-white px-6 py-2 font-bold rounded"
                  >
                    {isAdding ? "Save Expense" : "Update Expense"}
                  </button>
                </div>

              </div>
            </form>
          </div>
        )}

        {/* Expenses List */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 dark:bg-zinc-800">
              <tr>
                <th className="p-3 border-b border-r border-slate-200 dark:border-zinc-700 font-bold text-slate-600 dark:text-slate-400">Date</th>
                <th className="p-3 border-b border-r border-slate-200 dark:border-zinc-700 font-bold text-slate-600 dark:text-slate-400">Description</th>
                <th className="p-3 border-b border-r border-slate-200 dark:border-zinc-700 font-bold text-slate-600 dark:text-slate-400">Project</th>
                <th className="p-3 border-b border-r border-slate-200 dark:border-zinc-700 font-bold text-slate-600 dark:text-slate-400 text-right">Amount</th>
                <th className="p-3 border-b border-slate-200 dark:border-zinc-700 font-bold text-slate-600 dark:text-slate-400 text-center">Status</th>
                <th className="p-3 border-b border-slate-200 dark:border-zinc-700 font-bold text-slate-600 dark:text-slate-400 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {expenses.map((expense) => {
                const project = projects.find(p => p.id === expense.projectId);
                return (
                  <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="p-3 border-r border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300">
                      {formatDate(expense.date)}
                    </td>
                    <td className="p-3 border-r border-slate-200 dark:border-zinc-700 font-medium text-slate-900 dark:text-slate-100">
                      {expense.description}
                    </td>
                    <td className="p-3 border-r border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400">
                      {project ? project.name : <span className="italic text-slate-400">None</span>}
                    </td>
                    <td className="p-3 border-r border-slate-200 dark:border-zinc-700 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatMoney(expense.amount)}
                    </td>
                    <td className="p-3 border-slate-200 dark:border-zinc-700 text-center">
                      {!expense.isBillable ? (
                        <span className="text-xs font-bold uppercase text-slate-400">Non-Billable</span>
                      ) : expense.invoiceId ? (
                        <span className="text-xs font-bold uppercase text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Billed</span>
                      ) : (
                        <span className="text-xs font-bold uppercase text-amber-600 bg-amber-100 px-2 py-1 rounded">Unbilled</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => startEdit(expense)}
                        className="text-slate-400 hover:text-slate-900 dark:hover:text-white mr-3 transition-colors"
                        disabled={expense.invoiceId}
                        title={expense.invoiceId ? "Cannot edit billed expense" : "Edit"}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        disabled={expense.invoiceId}
                        title={expense.invoiceId ? "Cannot delete billed expense" : "Delete"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No expenses logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
