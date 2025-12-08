// Enhanced Expense Management Module

// Define showToast globally if it doesn't already exist
if (typeof window.showToast === 'undefined') {
    window.showToast = function(msg, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transform translate-x-full transition-transform duration-300 ${
            type === 'success' ? 'bg-green-600' :
            type === 'error' ? 'bg-red-600' :
            type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
        }`;
        toast.textContent = msg;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
            toast.classList.add('translate-x-0');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-0');
            toast.classList.add('translate-x-full');
            toast.addEventListener('transitionend', () => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            });
        }, duration);
    };
}

// Modern confirmation dialog
window.showConfirmDialog = function(title, message, confirmText = 'Delete', cancelText = 'Cancel', type = 'danger') {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'bg-slate-800 rounded-2xl shadow-2xl border border-slate-600/30 max-w-md w-full transform scale-95 transition-transform duration-200';
        
        const iconColor = type === 'danger' ? 'text-red-500' : 'text-yellow-500';
        const icon = type === 'danger' ? '🗑️' : '⚠️';
        const confirmButtonColor = type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700';
        
        dialog.innerHTML = `
            <div class="p-6">
                <div class="flex items-center space-x-4 mb-4">
                    <div class="text-3xl">${icon}</div>
                    <div>
                        <h3 class="text-lg font-semibold text-white">${title}</h3>
                        <p class="text-slate-400 text-sm">${message}</p>
                    </div>
                </div>
                <div class="flex space-x-3 justify-end">
                    <button class="cancel-btn px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200">
                        ${cancelText}
                    </button>
                    <button class="confirm-btn px-4 py-2 text-white ${confirmButtonColor} rounded-lg transition-all duration-200">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Animate in
        setTimeout(() => {
            dialog.classList.remove('scale-95');
            dialog.classList.add('scale-100');
        }, 10);
        
        // Event listeners
        const cancelBtn = dialog.querySelector('.cancel-btn');
        const confirmBtn = dialog.querySelector('.confirm-btn');
        
        const cleanup = () => {
            dialog.classList.remove('scale-100');
            dialog.classList.add('scale-95');
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 200);
        };
        
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
        
        confirmBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
            }
        });
        
        // ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(false);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
};

class ExpenseManager {
    constructor() {
        this.categories = [];
        this.expenses = [];
        this.recurringExpenses = [];
        this.currentExpense = null;
        this.currentCategory = null;
        this.currentRecurringExpense = null;
        this.isEditing = false;
        this.isSubmitting = false;
        this.isSubmittingCategory = false;
        this.isSubmittingRecurring = false;
        this.statistics = {
            totalExpenses: 0,
            monthExpenses: 0,
            totalCategories: 0,
            avgPerDay: 0,
            totalExpensesLastMonth: 0,
            monthExpensesLastMonth: 0,
            avgPerDayLastWeek: 0
        };
        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadExpenses();
        await this.loadRecurringExpenses();
        this.setupEventListeners();
        this.renderCategories();
        this.renderExpenses();
        this.renderRecurringExpenses();
        this.updateStatistics();
        this.updateDashboard();
    }

    setupEventListeners() {
        // Category management
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => this.showCategoryModal());
        document.getElementById('categoryForm')?.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        
        // Expense management
        document.getElementById('addExpenseBtn')?.addEventListener('click', () => this.showExpenseModal());
        document.getElementById('saveExpenseBtn')?.addEventListener('click', (e) => this.handleExpenseSubmit(e));
        
                 // Recurring expense management
         document.getElementById('addRecurringBtn')?.addEventListener('click', () => this.showRecurringExpenseModal());
         document.getElementById('saveRecurringBtn')?.addEventListener('click', (e) => this.handleRecurringExpenseSubmit(e));
         document.getElementById('generateRecurringBtn')?.addEventListener('click', () => this.generateRecurringExpenses());
        
        // Ensure all input fields in recurring expense modal are enabled
        document.getElementById('recurringExpenseModal')?.addEventListener('shown', () => {
            const inputs = document.querySelectorAll('#recurringExpenseModal input, #recurringExpenseModal select, #recurringExpenseModal textarea');
            inputs.forEach(input => {
                input.disabled = false;
                input.readOnly = false;
                input.style.pointerEvents = 'auto';
                input.style.userSelect = 'text';
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
            });
        });
        
        // Filters
        document.getElementById('expenseSearch')?.addEventListener('input', (e) => this.filterExpenses(e.target.value));
        document.getElementById('expenseDateFrom')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('expenseDateTo')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('expenseCategoryFilter')?.addEventListener('change', () => this.applyFilters());
        
        // Export
        document.getElementById('exportExpensesBtn')?.addEventListener('click', () => this.exportExpenses());
        
        // Close modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });

        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });

        // Add input validation for amount fields
        this.setupAmountValidation();
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/expense-categories');
            if (response.ok) {
                this.categories = await response.json();
                this.populateCategoryDropdowns();
                this.updateStatistics();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            showToast('Error loading categories', 'error');
        }
    }

    async loadExpenses() {
        try {
            const params = new URLSearchParams();
            const dateFrom = document.getElementById('expenseDateFrom')?.value;
            const dateTo = document.getElementById('expenseDateTo')?.value;
            const categoryId = document.getElementById('expenseCategoryFilter')?.value;
            const search = document.getElementById('expenseSearch')?.value;

            if (dateFrom) params.append('start_date', dateFrom);
            if (dateTo) params.append('end_date', dateTo);
            if (categoryId) params.append('category_id', categoryId);
            if (search) params.append('search', search);

            const response = await fetch(`/api/expenses?${params}`);
            if (response.ok) {
                this.expenses = await response.json();
                this.renderExpenses();
                this.updateStatistics();
            } else {
                console.error('ExpenseManager: Failed to load expenses, status:', response.status);
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
            showToast('Error loading expenses', 'error');
        }
    }

    async loadRecurringExpenses() {
        try {
            const response = await fetch('/api/recurring-expenses');
            if (response.ok) {
                this.recurringExpenses = await response.json();
                this.renderRecurringExpenses();
            } else {
                console.error('ExpenseManager: Failed to load recurring expenses, status:', response.status);
            }
        } catch (error) {
            console.error('Error loading recurring expenses:', error);
            showToast('Error loading recurring expenses', 'error');
        }
    }

    // Public method to refresh expenses (can be called from console for debugging)
    async refreshExpenses() {
        await this.loadExpenses();
    }

    populateCategoryDropdowns() {
        // Populate all category selects with the expense-category-select class
        const categorySelects = document.querySelectorAll('.expense-category-select');
        categorySelects.forEach(select => {
            select.innerHTML = '<option value="">Select Category</option>';
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = category.category_name;
                select.appendChild(option);
            });
        });

        // Also populate the recurring expense category dropdown
        const recurringCategorySelect = document.getElementById('recurringCategory');
        if (recurringCategorySelect) {
            recurringCategorySelect.innerHTML = '<option value="">Select Category</option>';
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = category.category_name;
                recurringCategorySelect.appendChild(option);
            });
        }

        // Also populate the filter dropdown
        const filterSelect = document.getElementById('expenseCategoryFilter');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">All Categories</option>';
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = category.category_name;
                filterSelect.appendChild(option);
            });
        }
    }

    updateStatistics() {
        // Calculate total expenses
        this.statistics.totalExpenses = this.expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        
        // Calculate current month expenses
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        this.statistics.monthExpenses = this.expenses.filter(expense => {
            const expenseDate = new Date(expense.expense_date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        }).reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        // Calculate total categories
        this.statistics.totalCategories = this.categories.length;

        // Calculate average per day (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentExpenses = this.expenses.filter(expense => {
            const expenseDate = new Date(expense.expense_date);
            return expenseDate >= thirtyDaysAgo;
        });
        const totalRecentExpenses = recentExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        this.statistics.avgPerDay = totalRecentExpenses / 30;

        // Update UI
        this.updateStatisticsUI();
    }

    updateStatisticsUI() {
        const totalExpensesEl = document.getElementById('totalExpenses');
        const monthExpensesEl = document.getElementById('monthExpenses');
        const totalCategoriesEl = document.getElementById('totalCategories');
        const avgPerDayEl = document.getElementById('avgPerDay');

        if (totalExpensesEl) {
            totalExpensesEl.textContent = `AED ${this.statistics.totalExpenses.toFixed(2)}`;
        }
        if (monthExpensesEl) {
            monthExpensesEl.textContent = `AED ${this.statistics.monthExpenses.toFixed(2)}`;
        }
        if (totalCategoriesEl) {
            totalCategoriesEl.textContent = this.statistics.totalCategories;
        }
        if (avgPerDayEl) {
            avgPerDayEl.textContent = `AED ${this.statistics.avgPerDay.toFixed(2)}`;
        }
    }

    renderCategories() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;

        if (this.categories.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="p-4 bg-gradient-to-br from-slate-800/60 to-slate-700/60 backdrop-blur-xl rounded-2xl border border-slate-600/30">
                        <svg data-lucide="folder" class="w-16 h-16 text-slate-400 mx-auto mb-4"></svg>
                        <h3 class="text-lg font-semibold text-white mb-2">No Categories Yet</h3>
                        <p class="text-slate-400 mb-4">Create your first expense category to get started</p>
                        <button onclick="expenseManager.showCategoryModal()" class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200">
                            <svg data-lucide="plus" class="w-4 h-4 mr-2"></svg>
                            Add Category
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.categories.map(category => {
            const categoryExpenses = this.expenses.filter(expense => expense.category_id === category.category_id);
            const totalAmount = categoryExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
            const expenseCount = categoryExpenses.length;

            return `
                <div class="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-600/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">${category.category_name}</h3>
                            <p class="text-sm text-slate-400 mt-1">${category.description || 'No description'}</p>
                        </div>
                        <div class="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button onclick="expenseManager.editCategory(${category.category_id})" 
                                    class="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded-lg transition-all duration-200">
                                <svg data-lucide="edit" class="w-4 h-4"></svg>
                            </button>
                            <button onclick="expenseManager.deleteCategory(${category.category_id})" 
                                    class="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200">
                                <svg data-lucide="trash-2" class="w-4 h-4"></svg>
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="text-center p-3 bg-slate-700/50 rounded-lg">
                            <p class="text-2xl font-bold text-white">${expenseCount}</p>
                            <p class="text-xs text-slate-400">Expenses</p>
                        </div>
                        <div class="text-center p-3 bg-slate-700/50 rounded-lg">
                            <p class="text-lg font-bold text-white">AED ${totalAmount.toFixed(2)}</p>
                            <p class="text-xs text-slate-400">Total</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderExpenses() {
        const container = document.getElementById('expensesContainer');
        if (!container) {
            return;
        }

        if (this.expenses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="p-8 bg-gradient-to-br from-slate-800/60 to-slate-700/60 backdrop-blur-xl rounded-2xl border border-slate-600/30">
                        <svg data-lucide="currency" class="w-16 h-16 text-slate-400 mx-auto mb-4"></svg>
                        <h3 class="text-lg font-semibold text-white mb-2">No Expenses Found</h3>
                        <p class="text-slate-400 mb-4">Start tracking your business expenses to see them here</p>
                        <button onclick="expenseManager.showExpenseModal()" class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200">
                            <svg data-lucide="plus" class="w-4 h-4 mr-2"></svg>
                            Add First Expense
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        const expensesHTML = this.expenses.map(expense => {
            const date = new Date(expense.expense_date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            const timeAgo = this.getTimeAgo(date);



            return `
                <div class="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-600/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-3">
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30">
                                    ${expense.category_name}
                                </span>
                                <span class="text-sm text-slate-400">
                                    ${formattedDate}
                                </span>
                                <span class="text-xs text-slate-500">
                                    ${timeAgo}
                                </span>
                            </div>
                            <h3 class="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                                AED ${parseFloat(expense.amount).toFixed(2)}
                            </h3>
                            <p class="text-sm text-slate-300 mb-3">
                                ${expense.description || 'No description'}
                            </p>
                            <div class="flex items-center space-x-4 text-xs text-slate-500">
                                <span class="flex items-center">
                                    <svg data-lucide="credit-card" class="w-3 h-3 mr-1"></svg>
                                    ${expense.payment_method}
                                </span>
                                ${expense.receipt_url ? `
                                    <a href="${expense.receipt_url}" target="_blank" class="flex items-center text-indigo-400 hover:text-indigo-300 transition-colors">
                                        <svg data-lucide="file-text" class="w-3 h-3 mr-1"></svg>
                                        Receipt
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="expenseManager.editExpense(${expense.expense_id})" 
                                    class="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded-lg transition-all duration-200 bg-slate-700/50 border border-indigo-500/30 hover:scale-105"
                                    title="Edit Expense">
                                <span class="text-lg">✏️</span>
                            </button>
                            <button onclick="expenseManager.deleteExpense(${expense.expense_id})" 
                                    class="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 bg-slate-700/50 border border-red-500/30 hover:scale-105"
                                    title="Delete Expense">
                                <span class="text-lg">🗑️</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = expensesHTML;
    }

    renderRecurringExpenses() {
        const container = document.getElementById('recurringContainer');
        if (!container) return;

        if (this.recurringExpenses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="p-8 bg-gradient-to-br from-slate-800/60 to-slate-700/60 backdrop-blur-xl rounded-2xl border border-slate-600/30">
                        <svg data-lucide="repeat" class="w-16 h-16 text-slate-400 mx-auto mb-4"></svg>
                        <h3 class="text-lg font-semibold text-white mb-2">No Recurring Bills</h3>
                        <p class="text-slate-400 mb-4">Set up recurring bills like rent, utilities, and subscriptions</p>
                        <button onclick="expenseManager.showRecurringExpenseModal()" class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200">
                            <svg data-lucide="plus" class="w-4 h-4 mr-2"></svg>
                            Add First Recurring Bill
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recurringExpenses.map(recurring => {
            const nextDueDate = new Date(recurring.next_due_date);
            const today = new Date();
            const daysUntilDue = Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24));
            const isOverdue = daysUntilDue < 0;
            const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

            let statusBadge = '';
            if (isOverdue) {
                statusBadge = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-500/30">Overdue</span>';
            } else if (isDueSoon) {
                statusBadge = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30">Due Soon</span>';
            } else {
                statusBadge = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30">Active</span>';
            }

            return `
                <div class="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-600/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-3">
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30">
                                    ${recurring.category_name}
                                </span>
                                ${statusBadge}
                                <span class="text-sm text-slate-400">
                                    ${recurring.frequency}
                                </span>
                            </div>
                            <h3 class="text-xl font-bold text-white mb-2 group-hover:text-green-300 transition-colors">
                                ${recurring.title}
                            </h3>
                            <p class="text-lg font-semibold text-green-400 mb-3">
                                AED ${parseFloat(recurring.amount).toFixed(2)}
                            </p>
                            <p class="text-sm text-slate-300 mb-3">
                                ${recurring.description || 'No description'}
                            </p>
                            <div class="flex items-center space-x-4 text-xs text-slate-500">
                                <span class="flex items-center">
                                    <svg data-lucide="calendar" class="w-3 h-3 mr-1"></svg>
                                    Next due: ${nextDueDate.toLocaleDateString()}
                                </span>
                                <span class="flex items-center">
                                    <svg data-lucide="credit-card" class="w-3 h-3 mr-1"></svg>
                                    ${recurring.payment_method}
                                </span>
                                ${isOverdue ? `<span class="text-red-400">${Math.abs(daysUntilDue)} days overdue</span>` : 
                                  isDueSoon ? `<span class="text-yellow-400">Due in ${daysUntilDue} days</span>` : 
                                  `<span class="text-green-400">Due in ${daysUntilDue} days</span>`}
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="expenseManager.editRecurringExpense(${recurring.recurring_id})" 
                                    class="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-all duration-200 bg-slate-700/50 border border-green-500/30 hover:scale-105"
                                    title="Edit Recurring Bill">
                                <span class="text-lg">✏️</span>
                            </button>
                            <button onclick="expenseManager.deleteRecurringExpense(${recurring.recurring_id})" 
                                    class="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 bg-slate-700/50 border border-red-500/30 hover:scale-105"
                                    title="Delete Recurring Bill">
                                <span class="text-lg">🗑️</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    }

    showCategoryModal(category = null) {
        this.currentCategory = category;
        this.isEditing = !!category;
        
        const modal = document.getElementById('categoryModal');
        const title = modal.querySelector('.modal-title');
        const form = document.getElementById('categoryForm');
        const nameInput = document.getElementById('categoryName');
        const descInput = document.getElementById('categoryDescription');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        title.textContent = this.isEditing ? 'Edit Category' : 'Add Category';
        submitBtn.textContent = this.isEditing ? 'Update Category' : 'Save Category';
        nameInput.value = category?.category_name || '';
        descInput.value = category?.description || '';
        
        modal.classList.remove('hidden');
        nameInput.focus();
    }

    showExpenseModal(expense = null) {
        this.currentExpense = expense;
        this.isEditing = !!expense;
        
        const modal = document.getElementById('expenseModal');
        const title = modal.querySelector('.modal-title');
        const dateInput = document.getElementById('expenseDate');
        const amountInput = document.getElementById('expenseAmount');
        const descInput = document.getElementById('expenseDescription');
        const categorySelect = document.getElementById('expenseCategory');
        const paymentSelect = document.getElementById('expensePaymentMethod');
        const receiptInput = document.getElementById('expenseReceiptUrl');
        const submitBtn = document.getElementById('saveExpenseBtn');
        
        // Ensure categories are populated
        this.populateCategoryDropdowns();
        
        title.textContent = this.isEditing ? 'Edit Expense' : 'Add Expense';
        submitBtn.textContent = this.isEditing ? 'Update Expense' : 'Save Expense';
        
        // Set values exactly like the working recurring modal
        if (expense && expense.expense_date) {
            // Format date properly for input field (YYYY-MM-DD)
            const date = new Date(expense.expense_date);
            const formattedDate = date.toISOString().split('T')[0];
            dateInput.value = formattedDate;
        } else {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
        amountInput.value = expense?.amount || '';
        descInput.value = expense?.description || '';
        categorySelect.value = expense?.category_id || '';
        paymentSelect.value = expense?.payment_method || 'Cash';
        receiptInput.value = expense?.receipt_url || '';
        
        modal.classList.remove('hidden');
        categorySelect.focus();
    }

    async showRecurringExpenseModal(recurring = null) {
        this.currentRecurringExpense = recurring;
        this.isEditing = !!recurring;
        
        const modal = document.getElementById('recurringExpenseModal');
        const title = modal.querySelector('.modal-title');
        const titleInput = document.getElementById('recurringTitle');
        const amountInput = document.getElementById('recurringAmount');
        const descInput = document.getElementById('recurringDescription');
        const categorySelect = document.getElementById('recurringCategory');
        const frequencySelect = document.getElementById('recurringFrequency');
        const paymentSelect = document.getElementById('recurringPaymentMethod');
        const startDateInput = document.getElementById('recurringStartDate');
        const submitBtn = document.getElementById('saveRecurringBtn');
        
        // Ensure categories are populated
        this.populateCategoryDropdowns();
        
        title.textContent = this.isEditing ? 'Edit Recurring Bill' : 'Add Recurring Bill';
        submitBtn.textContent = this.isEditing ? 'Update Recurring Bill' : 'Save Recurring Bill';
        titleInput.value = recurring?.title || '';
        amountInput.value = recurring?.amount || '';
        descInput.value = recurring?.description || '';
        categorySelect.value = recurring?.category_id || '';
        frequencySelect.value = recurring?.frequency || '';
        paymentSelect.value = recurring?.payment_method || 'Cash';
        startDateInput.value = recurring?.start_date || new Date().toISOString().split('T')[0];
        
        // Force enable and set styles
        amountInput.disabled = false;
        amountInput.readOnly = false;
        amountInput.removeAttribute('readonly');
        amountInput.removeAttribute('disabled');
        amountInput.style.color = 'white';
        amountInput.style.backgroundColor = '#475569';
        amountInput.style.webkitTextFillColor = 'white';
        amountInput.style.webkitTextStroke = '0';
        
        modal.classList.remove('hidden');
        titleInput.focus();
    }

    async handleCategorySubmit(e) {
        e.preventDefault();
        
        if (this.isSubmittingCategory) return;
        
        this.isSubmittingCategory = true;
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Saving...';
        submitButton.disabled = true;
        
        try {
            const formData = new FormData(e.target);
            const data = {
                category_name: formData.get('category_name').trim(),
                description: formData.get('description').trim()
            };
            
            if (!data.category_name) {
                showToast('Category name is required', 'error');
                return;
            }
            
            const url = this.isEditing ? `/api/expense-categories/${this.currentCategory.category_id}` : '/api/expense-categories';
            const method = this.isEditing ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showToast(this.isEditing ? 'Category updated successfully' : 'Category added successfully', 'success');
                this.closeModals();
                await this.loadCategories();
                this.renderCategories();
                this.updateStatistics();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to save category', 'error');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Error saving category', 'error');
        } finally {
            this.isSubmittingCategory = false;
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    async handleExpenseSubmit(e) {
        e.preventDefault?.();
        
        if (this.isSubmitting) return;
        
        this.isSubmitting = true;
        const submitButton = document.getElementById('saveExpenseBtn');
        const originalText = submitButton ? submitButton.textContent : 'Save Expense';
        if (submitButton) {
        submitButton.textContent = 'Saving...';
        submitButton.disabled = true;
        }
        
        try {
            const data = {
                category_id: document.getElementById('expenseCategory')?.value,
                expense_date: document.getElementById('expenseDate')?.value,
                amount: document.getElementById('expenseAmount')?.value,
                description: (document.getElementById('expenseDescription')?.value || '').trim(),
                payment_method: document.getElementById('expensePaymentMethod')?.value,
                receipt_url: (document.getElementById('expenseReceiptUrl')?.value || '').trim()
            };

            
            if (!data.category_id || !data.expense_date || !data.amount) {
                showToast('Category, date, and amount are required', 'error');
                return;
            }

            // Validate amount is a valid positive number
            const amount = parseFloat(data.amount);
            if (isNaN(amount) || amount <= 0) {
                showToast('Please enter a valid positive amount', 'error');
                return;
            }
            data.amount = amount; // Convert to number for backend
            
            const url = this.isEditing ? `/api/expenses/${this.currentExpense.expense_id}` : '/api/expenses';
            const method = this.isEditing ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showToast(this.isEditing ? 'Expense updated successfully' : 'Expense added successfully', 'success');
                this.closeModals();
                await this.loadExpenses();
                this.updateStatistics();
                this.updateDashboard();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to save expense', 'error');
            }
        } catch (error) {
            console.error('Error saving expense:', error);
            showToast('Error saving expense', 'error');
        } finally {
            this.isSubmitting = false;
            if (submitButton) {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            }
        }
    }

    async handleRecurringExpenseSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmittingRecurring) return;
        
        this.isSubmittingRecurring = true;
        const submitButton = document.getElementById('saveRecurringBtn');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Saving...';
        submitButton.disabled = true;
        
        try {
            // Get form data manually since we're not using a form element
            const data = {
                category_id: document.getElementById('recurringCategory').value,
                title: document.getElementById('recurringTitle').value.trim(),
                amount: document.getElementById('recurringAmount').value,
                description: document.getElementById('recurringDescription').value.trim(),
                payment_method: document.getElementById('recurringPaymentMethod').value,
                frequency: document.getElementById('recurringFrequency').value,
                start_date: document.getElementById('recurringStartDate').value
            };
            
            if (!data.category_id || !data.title || !data.amount || !data.frequency || !data.start_date) {
                showToast('Category, title, amount, frequency, and start date are required', 'error');
                return;
            }

            // Validate amount is a valid positive number
            const amount = parseFloat(data.amount);
            if (isNaN(amount) || amount <= 0) {
                showToast('Please enter a valid positive amount', 'error');
                return;
            }
            data.amount = amount; // Convert to number for backend
            
            const url = this.isEditing ? `/api/recurring-expenses/${this.currentRecurringExpense.recurring_id}` : '/api/recurring-expenses';
            const method = this.isEditing ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showToast(this.isEditing ? 'Recurring bill updated successfully' : 'Recurring bill added successfully', 'success');
                this.closeModals();
                await this.loadRecurringExpenses();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to save recurring bill', 'error');
            }
        } catch (error) {
            console.error('Error saving recurring bill', error);
            showToast('Error saving recurring bill', 'error');
        } finally {
            this.isSubmittingRecurring = false;
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    async editCategory(categoryId) {
        const category = this.categories.find(c => c.category_id === categoryId);
        if (category) {
            this.showCategoryModal(category);
        }
    }

    async deleteCategory(categoryId) {
        const confirmed = await showConfirmDialog(
            'Delete Category',
            'Are you sure you want to delete this category? This action cannot be undone.',
            'Delete',
            'Cancel',
            'danger'
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch(`/api/expense-categories/${categoryId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('Category deleted successfully', 'success');
                await this.loadCategories();
                this.renderCategories();
                this.updateStatistics();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete category', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Error deleting category', 'error');
        }
    }

    async editExpense(expenseId) {
        const expense = this.expenses.find(e => e.expense_id === expenseId);
        if (expense) {
            this.showExpenseModal(expense);
        } else {
            showToast('Expense not found', 'error');
        }
    }

    async deleteExpense(expenseId) {
        const confirmed = await showConfirmDialog(
            'Delete Expense',
            'Are you sure you want to delete this expense? This action cannot be undone.',
            'Delete',
            'Cancel',
            'danger'
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch(`/api/expenses/${expenseId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('Expense deleted successfully', 'success');
                await this.loadExpenses();
                this.updateStatistics();
                this.updateDashboard();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete expense', 'error');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            showToast('Error deleting expense', 'error');
        }
    }

    async editRecurringExpense(recurringId) {
        const recurring = this.recurringExpenses.find(r => r.recurring_id === recurringId);
        if (recurring) {
            this.showRecurringExpenseModal(recurring);
        }
    }

    async deleteRecurringExpense(recurringId) {
        const confirmed = await showConfirmDialog(
            'Delete Recurring Bill',
            'Are you sure you want to delete this recurring bill? This action cannot be undone.',
            'Delete',
            'Cancel',
            'danger'
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch(`/api/recurring-expenses/${recurringId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('Recurring bill deleted successfully', 'success');
                await this.loadRecurringExpenses();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete recurring bill', 'error');
            }
        } catch (error) {
            console.error('Error deleting recurring bill:', error);
            showToast('Error deleting recurring bill', 'error');
        }
    }

    async generateRecurringExpenses() {
        const confirmed = await showConfirmDialog(
            'Generate Recurring Expenses',
            'Generate expenses for all due recurring bills? This will create expense entries for bills that are due.',
            'Generate',
            'Cancel',
            'warning'
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch('/api/recurring-expenses/generate', {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                showToast(result.message, 'success');
                await this.loadExpenses();
                await this.loadRecurringExpenses();
                this.updateStatistics();
                this.updateDashboard();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to generate recurring expenses', 'error');
            }
        } catch (error) {
            console.error('Error generating recurring expenses:', error);
            showToast('Error generating recurring expenses', 'error');
        }
    }

    filterExpenses(search) {
        this.applyFilters();
    }

    applyFilters() {
        this.loadExpenses();
    }

    async exportExpenses() {
        try {
            const params = new URLSearchParams();
            const dateFrom = document.getElementById('expenseDateFrom')?.value;
            const dateTo = document.getElementById('expenseDateTo')?.value;
            const categoryId = document.getElementById('expenseCategoryFilter')?.value;

            if (dateFrom) params.append('start_date', dateFrom);
            if (dateTo) params.append('end_date', dateTo);
            if (categoryId) params.append('category_id', categoryId);

            const response = await fetch(`/api/expenses/download?${params}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'expenses.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast('Expenses exported successfully', 'success');
            }
        } catch (error) {
            console.error('Error exporting expenses:', error);
            showToast('Error exporting expenses', 'error');
        }
    }

    setupAmountValidation() {
        // Add input validation for expense amount field
        const expenseAmountField = document.getElementById('expenseAmount');
        if (expenseAmountField) {
            expenseAmountField.addEventListener('input', (e) => {
                const value = e.target.value;
                // Remove any non-numeric characters except decimal point
                const cleanValue = value.replace(/[^0-9.]/g, '');
                
                // Ensure only one decimal point
                const parts = cleanValue.split('.');
                if (parts.length > 2) {
                    e.target.value = parts[0] + '.' + parts.slice(1).join('');
                } else {
                    e.target.value = cleanValue;
                }
                
                // Validate the final value
                const numValue = parseFloat(cleanValue);
                if (isNaN(numValue) || numValue < 0) {
                    e.target.setCustomValidity('Please enter a valid positive number');
                } else {
                    e.target.setCustomValidity('');
                }
            });

            // Prevent paste of invalid content
            expenseAmountField.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const cleanText = pastedText.replace(/[^0-9.]/g, '');
                e.target.value = cleanText;
            });
        }

        // Add input validation for recurring expense amount field
        const recurringAmountField = document.getElementById('recurringAmount');
        if (recurringAmountField) {
            recurringAmountField.addEventListener('input', (e) => {
                const value = e.target.value;
                // Remove any non-numeric characters except decimal point
                const cleanValue = value.replace(/[^0-9.]/g, '');
                
                // Ensure only one decimal point
                const parts = cleanValue.split('.');
                if (parts.length > 2) {
                    e.target.value = parts[0] + '.' + parts.slice(1).join('');
                } else {
                    e.target.value = cleanValue;
                }
                
                // Validate the final value
                const numValue = parseFloat(cleanValue);
                if (isNaN(numValue) || numValue < 0) {
                    e.target.setCustomValidity('Please enter a valid positive number');
                } else {
                    e.target.setCustomValidity('');
                }
            });

            // Prevent paste of invalid content
            recurringAmountField.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const cleanText = pastedText.replace(/[^0-9.]/g, '');
                e.target.value = cleanText;
            });
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        this.currentCategory = null;
        this.currentExpense = null;
        this.currentRecurringExpense = null;
        this.isEditing = false;
    }

    async updateDashboard() {
        try {
            const response = await fetch('/api/dashboard');
            if (response.ok) {
                const data = await response.json();
                this.updateDashboardCards(data);
            }
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    updateDashboardCards(data) {
        // Update expense-related dashboard cards if they exist
        const todayExpensesCard = document.getElementById('todayExpensesCard');
        const monthExpensesCard = document.getElementById('monthExpensesCard');
        
        if (todayExpensesCard) {
            todayExpensesCard.querySelector('.card-value').textContent = `AED ${data.total_expenses_today.toFixed(2)}`;
        }
        
        if (monthExpensesCard) {
            monthExpensesCard.querySelector('.card-value').textContent = `AED ${data.total_expenses_month.toFixed(2)}`;
        }
    }
}



// Initialize ExpenseManager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (!window.expenseManager) {
        window.expenseManager = new ExpenseManager();
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading' && !window.expenseManager) {
    window.expenseManager = new ExpenseManager();
}






