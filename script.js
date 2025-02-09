let persons = JSON.parse(localStorage.getItem('persons')) || []
let expenses = JSON.parse(localStorage.getItem('expenses')) || []
let isEditing = false
let currentEditIndex = -1

function addPersons() {
    const personsInput = document.getElementById('personsInput').value
    const names = personsInput
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name)
    names.forEach((name) => {
        if (!persons.find((person) => person.name === name)) {
            persons.push({ name, totalExpense: 0 })
        }
    })
    document.getElementById('personsInput').value = ''
    localStorage.setItem('persons', JSON.stringify(persons))
    updatePersonOptions()
    updateSummaryTable()
    $('#addPersonsModal').modal('hide')
}

function updatePersonOptions() {
    const splitWithSelect = document.getElementById('splitWith')
    splitWithSelect.innerHTML = ''
    persons.forEach((person) => {
        const option = document.createElement('option')
        option.text = person.name
        splitWithSelect.add(option)
    })
}

function resetExpenseForm() {
    document.getElementById('expenseName').value = ''
    document.getElementById('expenseAmount').value = ''
    document.getElementById('splitWith').selectedIndex = -1
}

function clearLocalStorage() {
    localStorage.removeItem('persons')
    localStorage.removeItem('expenses')
    persons = []
    expenses = []
    updatePersonOptions()
    updateExpenseTable()
    updateSummaryTable()
}

window.onload = function () {
    updatePersonOptions()
    updateExpenseTable()
    updateSummaryTable()
}

function saveExpense() {
    const expenseName = document.getElementById('expenseName').value
    const expenseAmount = document.getElementById('expenseAmount').value
    const splitWith = Array.from(
        document.getElementById('splitWith').selectedOptions
    ).map((option) => option.value)

    if (expenseName && expenseAmount && splitWith.length > 0) {
        const expense = {
            name: expenseName,
            amount: parseFloat(expenseAmount),
            splitWith,
        }

        if (isEditing) {
            expenses[currentEditIndex] = expense
            isEditing = false
        } else {
            expenses.push(expense)
        }

        localStorage.setItem('expenses', JSON.stringify(expenses))
        updatePersonExpenses()
        resetExpenseForm()
        updateExpenseTable()
        $('#addExpenseModal').modal('hide')
    } else {
        alert('Please fill in all fields before saving.')
    }
}

function editExpense(index) {
    currentEditIndex = index
    const expense = expenses[index]
    document.getElementById('expenseName').value = expense.name
    document.getElementById('expenseAmount').value = expense.amount
    const splitWithSelect = document.getElementById('splitWith')
    Array.from(splitWithSelect.options).forEach((option) => {
        option.selected = expense.splitWith.includes(option.value)
    })
    isEditing = true
    $('#addExpenseModal').modal('show')
}

function updateExpenseTable() {
    const expensesTableBody = document.getElementById('expensesTableBody')
    expensesTableBody.innerHTML = ''
    expenses.forEach((expense, index) => {
        const row = document.createElement('tr')
        row.innerHTML = `
      <td>${expense.name}</td>
      <td>${expense.amount}</td>
      <td>${expense.splitWith.join(', ')}</td>
      <td><button class="btn btn-warning btn-sm" onclick="editExpense(${index})">Edit</button></td>
  `
        expensesTableBody.appendChild(row)
    })
}

function updatePersonExpenses() {
    persons.forEach((person) => (person.totalExpense = 0))
    expenses.forEach((expense) => {
        expense.splitWith.forEach((personName) => {
            const person = persons.find((p) => p.name === personName)
            if (person) {
                person.totalExpense += expense.amount / expense.splitWith.length
            }
        })
    })
    localStorage.setItem('persons', JSON.stringify(persons))
    updateSummaryTable()
}

function updateSummaryTable() {
    const summaryTableBody = document.getElementById('summaryTableBody')
    summaryTableBody.innerHTML = ''
    persons.forEach((person) => {
        const row = document.createElement('tr')
        row.innerHTML = `
      <td>${person.name}</td>
      <td>${person.totalExpense.toFixed(2)}</td>
  `
        summaryTableBody.appendChild(row)
    })
}
