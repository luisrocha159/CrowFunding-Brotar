/** Ejecutar desde backend: node --env-file-if-exists=.env scripts/check-mail.mjs */
async function main(){
 const args=process.argv.slice(2)
 if(args.some(arg=>!['--help','--send-self-test'].includes(arg))){console.error('Opciones no válidas. Usa --help. No pases contraseñas como argumentos.');return 2}
 if(args.includes('--help')){console.log('Verifica conexión y autenticación SMTP sin enviar mensajes. --send-self-test envía un mensaje sin tokens solo a SMTP_USER. Carga el .env con --env-file-if-exists=.env; nunca imprimas su contenido.');return 0}
 if(process.env.PASSWORD_RESET_LOCAL_FILE==='true'){console.error('El buzón local sigue activo. Para usar SMTP configura PASSWORD_RESET_LOCAL_FILE=false.');return 2}
 let module
 try{module=await import('../dist/auth/infrastructure/smtp-recovery-delivery.js')}catch{console.error('Compila primero el backend: corepack pnpm run build.');return 2}
 const config=module.smtpRecoveryConfig(process.env)
 if(!config){console.error('Configuración SMTP incompleta o inválida. Revisa SMTP_HOST/PORT/USER/PASSWORD/FROM y PUBLIC_WEB_ORIGIN en el .env privado. Gmail requiere su clave de aplicación de 16 caracteres y el mismo remitente que SMTP_USER.');return 2}
 const transport=module.smtpRecoveryTransport(config)
 try{
  await transport.verify()
  console.log('Conexión TLS y autenticación SMTP verificadas. Esta comprobación no envía mensajes.')
  if(args.includes('--send-self-test')){
   const result=await transport.sendMail({from:config.from,to:config.user,subject:'Brotar: prueba de configuración de correo',text:'Esta es una prueba solicitada de la configuración de correo de Brotar. No contiene enlaces de acceso, códigos, contraseñas ni datos de otros usuarios.'})
   if(!result.accepted.length){console.error('El servidor no aceptó el mensaje de prueba.');return 1}
   console.log('El servidor aceptó el mensaje dirigido a tu propio remitente. Comprueba su recepción y la carpeta de spam; la aceptación SMTP no confirma la llegada a la bandeja.')
  }
  return 0
 }catch(error){
  console.error(error?.code==='EAUTH'?'Autenticación rechazada. Revisa la dirección y la contraseña de aplicación de Google.':'No se pudo verificar o enviar por SMTP. Revisa conexión, TLS, configuración y disponibilidad del proveedor.')
  return 1
 }finally{transport.close()}
}
try{process.exitCode=await main()}catch{console.error('No se pudo comprobar el correo; no se muestran credenciales ni detalles privados.');process.exitCode=1}
