require('dotenv').config()
const token = process.env.ENTU_TOKEN

const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')
const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const result_csv_path = path.parse(__filename).dir + '/import_aumärgid_results.csv'
const result_stream = fs.createWriteStream(result_csv_path)
// 1. Read rows from 'import_aumärgid.csv'
const aumärgid_csv_path = path.parse(__filename).dir + '/import_aumärgid.csv'
const vrist_eid = '66b625807efc9ac06a437be3'

var counter = 0
const full_trshold = 6
const low_trshold = 3
var paused = false

const instream = fs.createReadStream(aumärgid_csv_path)
  .pipe(csv())
  .on('data', (csv_data) => {
    counter ++
    if (counter > full_trshold) {
      console.log('Pressing breaks...')
      instream.pause()
      paused = true
    }
    // 2. POST new entites and save result ID's
    console.log(`Adding new entity for ${csv_data.VR_Nr}, kavaler: ${csv_data.Kavaler_EID}`)
    fetch(
      `https://${entu_hostname}/${entu_account}/entity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          {type: '_type', string: 'vrist', reference: vrist_eid},
          {type: 'nr', string: csv_data.VR_Nr},
          {type: 'kavaler', 'reference': csv_data.Kavaler_EID},
          {type: 'liik_ja_jrk', string: csv_data.Liik_ja_jrk},
          {type: 'otsuse_kp', date: csv_data.Otsuse_kp},
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
        result_stream.write(`${csv_data.VR_Nr},${csv_data.Kavaler_EID},${new_id}\n`)
        console.log(`Added new entity: ${new_id} for nr: ${csv_data.VR_Nr}`)
      })
    })
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  })


