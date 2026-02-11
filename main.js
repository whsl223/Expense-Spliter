// let peopleSet = new Set(JSON.parse(localStorage.getItem('people') || '[]'))
// let expenseList = JSON.parse(localStorage.getItem('expenses') || '[]')

// Get the full query string from the current URL
const params = new URLSearchParams(window.location.search);
const userkey = params.get("userkey");


let peopleSet = []
let expenseList = []
let currentSummaryView = 'table'
// let userkey = "6Feb2026"

let db


(async function loadData(){
    db = supabase.createClient('https://bhspntmbfoqspmoewtup.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoc3BudG1iZm9xc3Btb2V3dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDI1MTIsImV4cCI6MjA4NjM3ODUxMn0.u2t_Ul4xbKUOwPZM5UAMLsU8WSTJnx3jvxMZevosP3I')
    const response = await db.from('expense').select('*').eq('userkey', userkey)
    const data = response.data[0]
    peopleSet = data?.peopleset || []
    expenseList = data?.transactions || []
    updateUI()
})()

// function saveToStorage() {
//     console.log("Saving to storage...")
//     localStorage.setItem('people', JSON.stringify([...peopleSet]))
//     localStorage.setItem('expenses', JSON.stringify(expenseList))
//     saveToCloud()
// }


async function  saveToStorage() {
    const cloudData = [
        {
            userkey,
            peopleset : [...peopleSet],
            transactions : [...expenseList]
        }
    ]

    const { data, error } = await db
    .from('expense')
    .upsert(cloudData, { onConflict: 'userkey' })
    .eq('userkey', userkey)
    .select()
}


function showAddPersonModal() {
    document.getElementById('personInput').value = ''
    new bootstrap.Modal(document.getElementById('personModal')).show()
}

function addPersonFromModal() {
    const names = document.getElementById('personInput').value
        .replace(/[，\/@#%^*.．！＠＃＄％︿＆＊（）]/g , ",")
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
    names.forEach((name) => peopleSet.add(name))
    saveToStorage()
    updateUI()
    bootstrap.Modal.getInstance(document.getElementById('personModal')).hide()
}

function showAddExpenseModal(index = null) {
    const modal = new bootstrap.Modal(document.getElementById('expenseModal'))
    document.getElementById('editingExpenseIndex').value = index ?? ''
    document.getElementById('expenseNameInput').value = ''
    document.getElementById('expenseAmountInput').value = ''

    const payerGroup = document.getElementById('payerRadioGroup')
    const splitGroup = document.getElementById('splitWithCheckboxGroup')
    payerGroup.innerHTML = ''
    splitGroup.innerHTML = ''
    ;[...peopleSet].forEach((person) => {
        payerGroup.innerHTML += `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="payerRadio" value="${person}" id="payer-${person}">
        <label class="form-check-label" for="payer-${person}">${person}</label>
      </div>`

        splitGroup.innerHTML += `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" value="${person}" id="split-${person}">
        <label class="form-check-label" for="split-${person}">${person}</label>
      </div>`
    })

    if (index !== null) {
        const exp = expenseList[index]
        document.getElementById('expenseNameInput').value = exp.name
        document.getElementById('expenseAmountInput').value = exp.total
        document.querySelector(
            `input[name="payerRadio"][value="${exp.payer}"]`
        ).checked = true
        exp.splitWith.forEach((p) => {
            document.getElementById(`split-${p}`).checked = true
        })
    }

    modal.show()
}

function saveExpense() {
    const index = document.getElementById('editingExpenseIndex').value
    const name = document.getElementById('expenseNameInput').value
    const total = parseFloat(
        document.getElementById('expenseAmountInput').value
    )
    const payer = document.querySelector(
        'input[name="payerRadio"]:checked'
    )?.value
    const splitWith = [
        ...document.querySelectorAll('#splitWithCheckboxGroup input:checked'),
    ].map((el) => el.value)

    if (!name || !payer || !splitWith.length || isNaN(total) || total <= 0) {
        alert('Please fill in all fields with valid data.')
        return
    }

    const newExpense = { name, total, payer, splitWith }

    if (index === '') {
        expenseList.push(newExpense)
    } else {
        expenseList[index] = newExpense
    }

    saveToStorage()
    updateUI()
    bootstrap.Modal.getInstance(document.getElementById('expenseModal')).hide()
}

function clearRecords() {
    window.location.href = window.location.origin + window.location.pathname;
    // localStorage.clear()
    // peopleSet = new Set()
    // expenseList = []
    // updateUI()
}

function deleteExpense(index) {
    if (confirm('確定要刪除這個項目嗎？')) {
        expenseList.splice(index, 1)
        saveToStorage()
        updateUI()
    }
}


function toggleSummaryView() {
    const table = document.querySelector('.summary-table')
    const cardContainer = document.getElementById('summaryCardContainer')

    if (currentSummaryView === 'table') {
        table.classList.add('d-none')
        cardContainer.classList.remove('d-none')
        currentSummaryView = 'card'
    } else {
        table.classList.remove('d-none')
        cardContainer.classList.add('d-none')
        currentSummaryView = 'table'
    }
}

function updateUI() {
    const tableBody = document.getElementById('expenseTableBody')
    tableBody.innerHTML = ''
    expenseList.forEach((e, i) => {
        if (typeof e.total !== 'number' || isNaN(e.total) || e.total <= 0)
            return
        tableBody.innerHTML += `
      <tr class="text-center">
        <td>${i + 1}</td>
        <td>${e.name}</td>
        <td>$${e.total.toFixed(2)}</td>
        <td>${e.payer}</td>
        <td>${e.splitWith.join(', ')}</td>
        <td>
        <button class="btn btn-sm btn-secondary" onclick="showAddExpenseModal(${i})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteExpense(${i})">Del</button>
        </td>
      </tr>`
    })

    const summary = {}
    peopleSet.forEach((p) => (summary[p] = { paid: 0, owed: 0 }))

    expenseList.forEach((e) => {
        const share = e.total / e.splitWith.length
        summary[e.payer].paid += e.total
        e.splitWith.forEach((p) => (summary[p].owed += share))
    })

    const netTransfers = {}
    peopleSet.forEach((from) => {
        netTransfers[from] = {}
        peopleSet.forEach((to) => {
            if (from !== to) netTransfers[from][to] = 0
        })
    })

    expenseList.forEach((e) => {
        const share = e.total / e.splitWith.length
        e.splitWith.forEach((p) => {
            if (p !== e.payer) {
                netTransfers[p][e.payer] += share
            }
        })
    })

    const netSettled = {}
    peopleSet.forEach((p) => (netSettled[p] = {}))
    peopleSet.forEach((p1) => {
        peopleSet.forEach((p2) => {
            const pay = netTransfers[p1][p2] || 0
            const receive = netTransfers[p2][p1] || 0
            const net = pay - receive
            if (net > 0.01) netSettled[p1][p2] = net
        })
    })

    const summaryBody = document.getElementById('summaryBody')
    summaryBody.innerHTML = ''
    for (const person of peopleSet) {
        const { paid, owed } = summary[person]
        const net = paid - owed
        let payDivs = '',
            receiveDivs = ''
        let receivedAmount = 0
        for (const [to, amount] of Object.entries(netSettled[person])) {
            payDivs += `<div class='essence-pay'> ${person} Pay $${amount.toFixed(2)} to ${to}</div>`
        }
        for (const [from, targets] of Object.entries(netSettled)) {
            if (targets[person]) {
                receiveDivs += `<div class='essence-receive'>Receive $${targets[person].toFixed(2)} from ${from}</div>`
                receivedAmount += targets[person]
            }
        }
        let isValid = paid == owed + net

        summaryBody.innerHTML += `
    <tr class="person">
      <td class="text-center fw-bold">${person}</td>
      <td class="text-center ">$${paid.toFixed(2)}</td>
      <td class="p-1">
        <div class="table-responsive border rounded">
          <table class="table table-bordered align-middle m-0">
            <tbody>
              <tr>
                <td class="fw-bold text-end">$1</td>
                <td>${owed.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="fw-bold text-end">$2</td>
                <td>${net.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="fw-bold text-end">$3</td>
                <td class=>${(owed + net).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="mt-2 text-center ${isValid ? 'text-success fw-bold' : 'text-danger fw-bold'}">
            ${isValid ? 'Valid' : 'Invalid'}
          </div>
        </div>
      </td>
      <td class="text-center">${payDivs || ''}</td>
      <td class="text-start">
        ${receivedAmount ? `<div class="text-success fw-bold">總共收: $${receivedAmount.toFixed(2)}</div>` : ''}
        ${receiveDivs || ''}
      </td>
    </tr>`
    }

    // Card View Rendering
    const cardContainer = document.getElementById('summaryCardContainer')
    cardContainer.innerHTML = ''
    for (const person of peopleSet) {
        const { paid, owed } = summary[person]
        const net = paid - owed
        let payHtml = '',
            receiveHtml = ''
        let receivedAmount = 0

        for (const [to, amount] of Object.entries(netSettled[person])) {
            payHtml += `<div class='essence-pay mb-1'>Pay $${amount.toFixed(2)} to ${to}</div>`
        }
        for (const [from, targets] of Object.entries(netSettled)) {
            if (targets[person]) {
                receiveHtml += `<div class='essence-receive mb-1'>Receive $${targets[person].toFixed(2)} from ${from}</div>`
                receivedAmount += targets[person]
            }
        }

        const card = document.createElement('div')
        card.className = 'col-md-6 col-lg-4 mb-3'
        let isValid = paid == owed + net
        card.innerHTML = `
    <div class="card h-100 shadow-sm">
      <div class="card-body">
        <h5 class="card-title">${person}</h5>
        <p><strong>Paid:</strong> $${paid.toFixed(2)}</p>
        <div class="mb-3">
          <p><strong>Details:</strong></p>
          <div class="table-responsive">
            <table class="table table-bordered text-center align-middle">
              <tbody>
                <tr>
                  <td>$1</td>
                  <td>${owed.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>$2</td>
                  <td>${net.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>$3</td>
                  <td>${(owed + net).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div class="${isValid ? 'text-success fw-bold' : 'text-danger fw-bold'}">
              ${isValid ? 'Valid' : 'Invalid'}
            </div>
          </div>
        </div>
        <div><strong>Pay:</strong> ${payHtml || '<em>None</em>'}</div>
        <div><strong>Receive:</strong> ${receivedAmount ? `<div>Total $${receivedAmount.toFixed(2)}:</div>` : ''}${receiveHtml || '<em>None</em>'}</div>
      </div>
    </div>`
        cardContainer.appendChild(card)
    }

    // Person filter buttons
    const personButtonsContainer = document.getElementById('personButtons')
    personButtonsContainer.innerHTML = ''
    let showAllButton

    function clearButtonActiveStyles() {
        personButtonsContainer.querySelectorAll('button').forEach((btn) => {
            btn.classList.remove('btn-primary', 'text-white')
            if (btn.textContent === 'Show All') {
                btn.classList.remove('btn-outline-primary')
                btn.classList.add('btn-outline-primary')
            } else {
                btn.classList.remove('btn-outline-primary')
                btn.classList.add('btn-outline-primary')
            }
        })
    }

    showAllButton = document.createElement('button')
    showAllButton.className = 'btn btn-outline-primary'
    showAllButton.textContent = 'Show All'
    showAllButton.onclick = () => {
        document
            .querySelectorAll('#summaryBody tr.person')
            .forEach((row) => (row.style.display = ''))
        document
            .querySelectorAll('#summaryCardContainer .card')
            .forEach((card) => (card.parentElement.style.display = ''))
        clearButtonActiveStyles()
        showAllButton.classList.remove('btn-outline-primary')
        showAllButton.classList.add('btn-primary', 'text-white')
    }
    personButtonsContainer.appendChild(showAllButton)
    ;[...peopleSet].forEach((person) => {
        const btn = document.createElement('button')
        btn.className = 'btn btn-outline-primary'
        btn.textContent = person
        btn.onclick = () => {
            document
                .querySelectorAll('#summaryBody tr.person')
                .forEach((row) => {
                    row.style.display =
                        row.children[0].textContent.trim() === person
                            ? ''
                            : 'none'
                })
            document
                .querySelectorAll('#summaryCardContainer .card')
                .forEach((card) => {
                    const isMatch =
                        card
                            .querySelector('.card-title')
                            ?.textContent.trim() === person
                    card.parentElement.style.display = isMatch ? '' : 'none'
                })

            clearButtonActiveStyles()
            showAllButton.classList.remove('btn-primary', 'text-white')
            showAllButton.classList.add('btn-outline-primary')
            btn.classList.remove('btn-outline-primary')
            btn.classList.add('btn-primary', 'text-white')
        }
        personButtonsContainer.appendChild(btn)
    })

    // Initially mark Show All as active

    showAllButton.classList.add('btn-primary', 'text-white')


    const tips = document.querySelector('#tips')
    const pays = document.querySelectorAll('.essence-pay')
    //console.log(Array.from(pays).map((el) => `<div>${el.textContent}</div>`).splice(0, pays.length/2))
    tips.innerHTML = Array.from(pays).map((el) => `<div>${el.textContent}</div>`).splice(0, pays.length/2).join('')
    }

updateUI()
