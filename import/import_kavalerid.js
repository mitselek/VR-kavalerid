require('dotenv').config()
const token = process.env.ENTU_TOKEN

const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')
const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const result_csv_path = path.parse(__filename).dir + '/import_kavalerid_results.csv'
const result_stream = fs.createWriteStream(result_csv_path)
// 1. Read rows from 'import_kavalerid.csv'
// const kavalerid_csv_path = path.parse(__filename).dir + '/VR Kavalerid puhtand - kavalerid.csv'
const kavalerid_csv_path = path.parse(__filename).dir + '/test.csv'
const kavalerid_entu_type = {'type': '_type', 'string': 'vr_kavaler', 'reference': '66d56de42acf2af0bc794b9d'}

var counter = 0
const full_trshold = 6
const low_trshold = 3
var paused = false

const instream = fs.createReadStream(kavalerid_csv_path)
  .pipe(csv())
  .on('data', (csv_data) => {
    counter ++
    if (counter > full_trshold) {
      // console.log('Pressing breaks...')
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
          kavalerid_entu_type,
          {'type': 'vr_id', 'string': csv_data.vr_id},
          {'type': 'name', 'string': csv_data.Nimi},
          {'type': 'eesnimi', 'string': csv_data.Eesnimi},
          {'type': 'perenimi', 'string': csv_data.Perenimi},
          {'type': 'emaisa', 'string': csv_data.Emaisa},
          {'type': 'synd', 'string': csv_data.Sünd},
          {'type': 'amet', 'string': csv_data.Amet},
          {'type': 'biograafia', 'string': csv_data.Biograafia},
        ])
      }
    )
    .then(response => response.json())
    .then(json_data => {
      // console.log(`Response data: ${JSON.stringify(json_data)}`)
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
          // console.log('Resuming...')
          instream.resume()
          paused = false
        }
        // 4. Save results to 'import_kavalerid_results.csv'
        result_stream.write(`${csv_data.vr_id},${new_id}\n`)
        console.log(`Added new entity: ${new_id} for nr: ${csv_data.vr_id}`)
      })
    })
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  })


