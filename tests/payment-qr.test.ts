import {test} from 'node:test'
import assert from 'node:assert/strict'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import {demoTicketFrom} from '../src/features/contributions/demoClient'
import {paymentQrPayload,paymentQrOptions} from '../src/features/contributions/paymentQrPayload'
const ticket=demoTicketFrom({paymentId:'8cdca2ce-4764-44a1-8aab-584f70ede7df',contributionId:'7ca21b07-2ad1-478f-9940-08030cb37190',reference:'BRT-TEST',amount:'10.00',currencyCode:'BOB',status:'INITIATED',attempt:1,expiresAt:null,expired:false,mode:'DEMO',payable:false,qrPayload:'BROTAR-DEMO:8cdca2ce-4764-44a1-8aab-584f70ede7df'})

test('QR del aporte: referencia e importe de la operación, sin datos privados ni autorización de cobro',()=>{
 const decorated={...ticket,email:'privado@example.invalid',password:'no-incluir'}
 const text=paymentQrPayload(decorated)
 assert.deepEqual(JSON.parse(text),{application:'Brotar',type:'CONTRIBUTION',paymentId:ticket.paymentId,reference:ticket.reference,amount:'10.00',currency:'BOB',mode:'SIMULATION',payable:false})
 assert.doesNotMatch(text,/privado@example|no-incluir/)
 assert.notEqual(paymentQrPayload({...ticket,paymentId:'06ec727d-4664-45c9-b704-01880c7a8832'}),text)
})

test('QR real: un lector independiente decodifica la referencia exacta y se genera una imagen PNG',async()=>{
 const text=paymentQrPayload(ticket),code=QRCode.create(text,paymentQrOptions),scale=5,margin=4,width=(code.modules.size+margin*2)*scale
 const pixels=new Uint8ClampedArray(width*width*4).fill(255)
 for(let row=0;row<code.modules.size;row++)for(let col=0;col<code.modules.size;col++)if(code.modules.data[row*code.modules.size+col]){
  for(let y=0;y<scale;y++)for(let x=0;x<scale;x++){
   const i=(((row+margin)*scale+y)*width+(col+margin)*scale+x)*4
   pixels[i]=0;pixels[i+1]=0;pixels[i+2]=0
  }
 }
 const decoded=jsQR(pixels,width,width)
 assert.equal(decoded?.data,text)
 assert.match(await QRCode.toDataURL(text,paymentQrOptions),/^data:image\/png;base64,/)
})
