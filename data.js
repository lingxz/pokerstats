const SPREADSHEET_LINK_TEMPLATE = "https://docs.google.com/spreadsheets/d/1w-ZbAbDXfWF7BajLAv6Pq0DS8FXCFH43YP8KIaOCtAM/gviz/tq?tqx=out:csv&sheet={{sheet_id}}";

const exampleData = [
  {
    date: "20230506",
    people: {
      "person1": {
        name: "person1",
        in: 80,
        out: 220,
      },
      "person2": {
        name: "person2",
        in: 220,
        out: 80
      }
    },
  },
  {
    date: "20230513",
    people: {
      "person2": {
        name: "person1",
        in: 80,
        out: 220,
      },
      "person3": {
        name: "person2",
        in: 312,
        out: 200
      }
    },
  }
]

const SPECIAL_COLUMN_NAMES = ["Date", "Type", "Buyin", "Guest", "Guest2", "Rebuys", "Notes"];
const parseRebuys = (rebuyStr) => {
  const rebuys = new Map();
  if (rebuyStr == "") {
    return rebuys;
  }
  for (const item of rebuyStr.split(",")) {
    let split = item.trim().split(":");
    rebuys.set(split[0].trim(), parseInt(split[1].trim()));
  }
  return rebuys;
}
const cleanData = (items) => {
  const sessions = [];
  for (const item of items) {
    const session = {people: {}};
    session.date = item.Date;
    const buyin = parseInt(item.Buyin);
    const rebuys = parseRebuys(item.Rebuys);
    for (const col in item) {
      if (item[col] == "") {
        continue;
      }
      if (SPECIAL_COLUMN_NAMES.includes(col)) {
        continue;
      }
      const spent = ((rebuys.get(col) || 0) + 1) * buyin;
      const out = parseFloat(item[col]); 
      session.people[col] = {
        name: col,
        in: spent,
        out: out,
        net: out - spent,
      }
    }
    sessions.push(session);
  }
  return sessions;
}

const fileParsing = (sheet_url) => new Promise((resolve)=> {
  Papa.parse(sheet_url, {
   download: true,
   header: true,
   newline: "",
   complete: function(results, file) {resolve(results.data);}
  });
})


async function getSessions(year) {  
  const sheet_url = SPREADSHEET_LINK_TEMPLATE.replace("{{sheet_id}}", year);
  const data = await(fileParsing(sheet_url));
  return cleanData(data);
}