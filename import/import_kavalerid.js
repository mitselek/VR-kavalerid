require('dotenv').config()
const token = process.env.ENTU_TOKEN


/*
** 1. Read rows from 'import_kavalerid.csv'
**
** sample data:
Nr,surname,forename
0001,LAIDONER,Johan
0002,SOOTS,Jaan
** 
** 2. POST new entites and save result ID's
**
** sample request:
** 
POST {{hostname}}/{{account}}/entity HTTP/1.1
Accept-Encoding: deflate
Authorization: Bearer {{token}}
Content-Type: application/json; charset=utf-8

[
    {"type": "_type", "string": "vrkavaler", "reference": "66d56de42acf2af0bc794b9d"},
    {"type": "forename", "string": "Jane4"},
    {"type": "surname", "string": "Doe4"}
]

** 3. To help with aggregation, follow POST with 
POST {{hostname}}/{{account}}/entity/{{id}}/aggregate

** 4. Save results to 'import_kavalerid_results.csv'
*/

const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')
const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const result_csv_path = path.parse(__filename).dir + '/import_kavalerid_results.csv'
const result_stream = fs.createWriteStream(result_csv_path)
// 1. Read rows from 'import_kavalerid.csv'
const kavalerid_csv_path = path.parse(__filename).dir + '/import_kavalerid.csv'

var counter = 0
const full_trshold = 6
const low_trshold = 3
var paused = false

const instream = fs.createReadStream(kavalerid_csv_path)
  .pipe(csv())
  .on('data', (csv_data) => {
    counter ++
    if (counter > full_trshold) {
      console.log('Pressing breaks...')
      instream.pause()
      paused = true
    }
    // 2. POST new entites and save result ID's
    fetch(
      `https://${entu_hostname}/${entu_account}/entity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          {'type': '_type', 'string': 'vrkavaler', 'reference': '66d56de42acf2af0bc794b9d'},
          {'type': 'surname', 'string': csv_data.surname},
          {'type': 'forename', 'string': csv_data.forename}
        ])
      }
    )
    .then(response => response.json())
    .then(json_data => {
      let new_id = json_data._id
      // 3. aggregate new entity
      fetch(`https://${entu_hostname}/${entu_account}/entity/${new_id}/aggregate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(json_data => {
        counter--
        if (counter < low_trshold && paused) {
          console.log('Resuming...')
          instream.resume()
          paused = false
        }
        // 4. Save results to 'import_kavalerid_results.csv'
        result_stream.write(`${csv_data.Nr},${new_id}\n`)
        console.log(`Added new entity: ${new_id} for nr: ${csv_data.Nr}`)
      })
    })
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  })


