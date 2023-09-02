const accumulate = array => array.map((sum => value => sum += value)(0));

const getPeopleFromLastNSessions = (sessions, n) => {
  // Returns people sorted by descending frequency of attendance
  const people = {};
  for (let s of sessions.slice(-n)) {
    for (const p in s.people) {
      if (p in people) {
        people[p] = people[p] + 1;
      } else {
        people[p] = 1;
      }
    }
  }

  return Object.entries(people).sort((a, b)=> b[1] - a[1]).map(([key, _]) => key);
}

// gets the datasets for last n sessions
const getDatasets = (sessions, peopleSet, n) => {
  const sessionsByPeople = {};
  for (const p of peopleSet) {
    sessionsByPeople[p] = [];
  }

  for (let s of sessions) {
    for (const p of peopleSet) {
      if (p in s.people) {
        sessionsByPeople[p].push(s.people[p].net);
      } else {
        sessionsByPeople[p].push(0);
      }
    }
  }
  
  const dataset = []
  for (const p of peopleSet) {
    dataset.push({
      label: p,
      data: accumulate(sessionsByPeople[p].slice(-n)),
    })
  }
  return dataset;
}

const getCheckedPeople = () => {
  const div = document.getElementById('people');
  const checkboxes = div.querySelectorAll('input[type="checkbox"]');
  const checkedIds = [];
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      // Add the checkbox's ID to the array
      checkedIds.push(checkbox.id);
    }
  });
  return checkedIds;
}

const reloadChart = (sessions, chart) => {
  const newInputN = parseInt(document.getElementById('num-sessions').value);
  const n = Math.min(newInputN, sessions.length);
  chart.data.labels = [...Array(n).keys()];
  chart.data.datasets = getDatasets(sessions, getCheckedPeople(), n);
  chart.update();
}

const generateChart = (sessions) => {
  Chart.defaults.font.size = 16;

  const numSessionsInput = document.getElementById('num-sessions');
  const inputN = parseInt(numSessionsInput.value);
  const n = Math.min(inputN, sessions.length);

  const people = getPeopleFromLastNSessions(sessions, sessions.length);
  const peopleToPlot = getPeopleFromLastNSessions(sessions, 1);

  const data = {
    labels: [...Array(n).keys()],
    datasets: getDatasets(sessions, peopleToPlot, n),
  }
  
  const config = {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Cumulative returns over last N sessions'
        }
      }
    },
  };
  
  const ctx = document.getElementById('chart');
  let chart = new Chart(ctx, config);

  numSessionsInput.addEventListener('input', (e) => {
    reloadChart(sessions, chart);
  });

  // Set the checkboxes, default to people from last session
  const peopleDiv = document.getElementById('people');
  for (const p of people) {
    let checkbox = document.createElement("input");
    checkbox.id = p;
    checkbox.type = 'checkbox';
    if (peopleToPlot.includes(p)) {
      checkbox.checked = true;
    }
    checkbox.addEventListener('change', () => {
      reloadChart(sessions, chart);
    })
    const label = document.createElement('label');
    label.setAttribute("for", p);
    label.textContent = p;
    peopleDiv.appendChild(checkbox);
    peopleDiv.appendChild(label);
  }
}

const getPeopleToSessions = (sessions) => {
  const peopleToSessions = {};
  for (const s of sessions) {
    for (const p in s.people) {
      const item = {result: s.people[p].net, date: s.date};
      if (p in peopleToSessions) {
        peopleToSessions[p].push(item);
      } else {
        peopleToSessions[p] = [item];
      }
    }
  }
  return peopleToSessions;
}

const getStats = (sessions) => {
  const peopleToSessions = getPeopleToSessions(sessions);
  // stats
  const chipLeader = {amount: 0, person: null, desc: "Chip Leader"};
  const biggestLoser = {amount: 0, person: null, desc: "Biggest Loser"};
  const biggestSingleSessionWin = {amount: 0, person: null, date: null, desc: "Biggest single session win"};
  const biggestSingleSessionLoss = {amount: 0, person: null, date: null, desc: "Biggest single session loss"};
  const stats = {};
  for (const p in peopleToSessions) {
    const s = peopleToSessions[p];
    const personStats = {};
    let net = 0;
    let wins = 0;
    for (session of s) {
      r = session.result;
      if (r > 0) wins += 1;
      net += r;
      if (r < 0 && Math.abs(r) > biggestSingleSessionLoss.amount) {
        biggestSingleSessionLoss.amount = Math.abs(r);
        biggestSingleSessionLoss.person = p;
        biggestSingleSessionLoss.date = session.date;        
      }
      if (r > 0 && r > biggestSingleSessionWin.amount) {
        biggestSingleSessionWin.amount = r;
        biggestSingleSessionWin.person = p;
        biggestSingleSessionWin.date = session.date;
      }
    }
    if (net > chipLeader.amount) {
      chipLeader.amount = net;
      chipLeader.person = p;
    }
    if (net < 0 && Math.abs(net) > biggestLoser.amount) {
      biggestLoser.amount = Math.abs(net);
      biggestLoser.person = p;
    }
    personStats["Profit"] = parseFloat(net.toFixed(2));
    personStats["WinRatio"] = parseFloat((wins / s.length).toFixed(2));
    personStats["ProfitPerSession"] = parseFloat((net / s.length).toFixed(2));
    personStats["Sessions"] = s.length;
    stats[p] = personStats;
  }
  biggestSingleSessionLoss.amount = -Math.abs(biggestSingleSessionLoss.amount);
  biggestLoser.amount = -Math.abs(biggestLoser.amount);
  return {
    perPersonStats: stats,
    overallStats: [chipLeader, biggestSingleSessionWin, biggestLoser, biggestSingleSessionLoss]
  }
}

const generateStatCards = (stats, statsDiv) => {
  for (const stat of stats) {
    const text = stat.desc + ": " + stat.amount.toFixed(2) + " (" + stat.person + ")";
    statsDiv.append(text);
    statsDiv.appendChild(document.createElement("br"));
  }
}

// Just a hack so that we can destroy it later when reloading.
let GRID = null;

const generateTable = (stats, element) => {
  const data = [];
  for (const person in stats) {
    const row = [person, stats[person].Profit, stats[person].WinRatio, stats[person].ProfitPerSession, stats[person].Sessions];
    data.push(row);
  }
  console.log(stats);
  const headers = ["Name", "Profit", "WinRatio", "ProfitPerSession", "Sessions"];
  GRID = new gridjs.Grid({
    columns: headers,
    data: data,
    sort: true,
    fixedHeader: true,
    resizable: true,
  });
  GRID.render(element);
  
}

const generateStats = (sessions) => {
  const stats = getStats(sessions);
  generateStatCards(stats.overallStats, document.getElementById('stats'));
  generateTable(stats.perPersonStats, document.getElementById('stats-table'));
}

const validateTotal = (sessions) => {
  for (const s of sessions) {
    total = 0;
    for (const p in s.people) {
      total += s.people[p].net;
    }
    // Floating point issues...
    total = parseFloat(total.toFixed(2))
    if (total != 0) {
      console.log("Session ", s.date, " is wrong, off by $", total, " (negative means extra money, positive is bad)");
    }
  }
}

const refresh = () => {
  // Manually clear everything, lol
  let chart = Chart.getChart('chart');
  if (chart != undefined) {
    chart.destroy();
  }
  if (GRID != null) {
    GRID.destroy();
  }
  document.getElementById("stats-table").innerHTML = "";
  document.getElementById("stats").innerHTML = "";
  document.getElementById("people").innerHTML = "";
  const year = parseInt(document.getElementById("year").value);
  getSessions(year).then((sessions) => {
    generateChart(sessions);
    generateStats(sessions);
    validateTotal(sessions);
  });
  document.getElementById("year-number").innerHTML = year;
}

refresh();

document.getElementById("year-form").addEventListener('submit', (e) => {
  e.preventDefault();
  refresh();
})