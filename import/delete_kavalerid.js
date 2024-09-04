/*

###
# entity GET VRK id's
GET {{hostname}}/{{account}}/entity?_type.string=vrkavaler&props=_id HTTP/1.1
Accept-Encoding: deflate
Authorization: Bearer {{token}}

result:
{
  "entities": [
    {
      "_id": "66d838b0f2daf46b3143f320"
    },
    {
      "_id": "66d838b0f2daf46b3143f322"
    },
    ...
    
###
# DELETE entity
DELETE {{hostname}}/{{account}}/entity/66d771c4f2daf46b3143f057
Accept-Encoding: deflate
Authorization: Bearer {{token}}
Content-Type: application/json; charset=utf-8

*/

require('dotenv').config()
const token = process.env.ENTU_TOKEN
console.log(token)

const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const list_vrk = `https://${entu_hostname}/${entu_account}/entity?_type.string=vrkavaler&props=_id`
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