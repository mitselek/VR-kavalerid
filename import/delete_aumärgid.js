require('dotenv').config()
const token = process.env.ENTU_TOKEN
console.log(token)

const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const list_vrk = `https://${entu_hostname}/${entu_account}/entity?_type.string=vrist&props=_id`
const delete_vrk = `https://${entu_hostname}/${entu_account}/entity/`
console.log(list_vrk)

fetch(list_vrk, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept-Encoding': 'deflate'
  }
})
.then(response => response.json())
.then(data => {
  // console.log(data.entities)
  data.entities.forEach(entity => {
    const id = entity._id
    fetch(`${delete_vrk}${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept-Encoding': 'deflate'
      }
    })
    .then(response => {
      // console.log(response)
    })
    console.log(`Listed: ${id}`)
  })
})