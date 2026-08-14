/**
 * RIFA DEL CLUB — Backend (Google Apps Script)
 * ------------------------------------------------------------
 * Script LIGADO a la planilla (Extensiones > Apps Script desde la hoja).
 *
 * PRIMER USO:
 *   1) Pegá este código, guardá.
 *   2) Elegí la función  crearHojas  y dale "Ejecutar" (autorizá cuando pida).
 *   3) Implementar > Nueva implementación > Aplicación web
 *        Ejecutar como: Yo    |    Quién tiene acceso: Cualquier persona
 *   4) Copiá la URL /exec y pegala en Ajustes de la app.
 *
 * IMPORTANTE: cada vez que edites este archivo hay que volver a implementar
 * (Implementar > Administrar implementaciones > lápiz > Versión: Nueva).
 * Si no, el front manda campos que el backend ignora en silencio.
 */

var SH_VENTAS = 'Ventas';
var SH_CONFIG = 'Config';
var SH_VEND   = 'Vendedores';
var SH_GAN    = 'Ganadores';

var COLS_VENTAS = ['ID','Numeros','Nombre','Telefono','Pago','Monto','Vendedor','Fecha','Anulado'];
var COLS_GAN    = ['Premio','Numero','Nombre','Telefono','Vendedor','Fecha','Anulado','VuelveAlBolillero','AnuladoEl'];

// Texto del comprobante que el vendedor le manda al comprador por WhatsApp.
// Comodines disponibles: {nombre} {numeros} {cantidad} {monto} {rifa}
//                        {vendedor} {pago} {premios}
// Para cortar renglón escribí  \n  (barra invertida + n), no Alt+Enter.
// Cuando la persona lleva MÁS DE UN número:
var MSG_WA_DEF = 'Hola {nombre}! Gracias por colaborar con la {rifa}.\\n' +
                 'Tus números son: {numeros}\\n' +
                 'Total: {monto} ({pago})\\n' +
                 'Te los vendió {vendedor}. ¡Mucha suerte!';

// Cuando lleva UNO SOLO (se usa este y no el de arriba):
var MSG_WA_1_DEF = 'Hola {nombre}! Gracias por colaborar con la {rifa}.\\n' +
                   'Tu número es el {numeros}\\n' +
                   'Total: {monto} ({pago})\\n' +
                   'Te lo vendió {vendedor}. ¡Mucha suerte!';

var CONFIG_DEF = [
  ['nombreRifa','Rifa Club Mitre','Título que se ve arriba en la app'],
  ['totalNumeros','300','Cuántos números tiene la rifa'],
  ['precios','1=10000; 2=15000; 3=22000','Precio TOTAL según cuántos números lleve la misma persona'],
  ['precioExtra','7000','Cuánto suma cada número más allá del último escalón'],
  ['premios','1º Premio | 2º Premio | 3º Premio','Separados por barra vertical'],
  ['token','cambiar-esta-clave','Clave compartida. Cambiala y pasásela solo a los vendedores'],
  ['ventaAbierta','SI','Poné NO para cerrar la carga antes del sorteo'],
  ['msgWhatsapp', MSG_WA_DEF, 'Comprobante cuando lleva VARIOS números. Comodines: {nombre} {numeros} {cantidad} {monto} {rifa} {vendedor} {pago} {premios}. Usá \\n para cortar renglón'],
  ['msgWhatsapp1', MSG_WA_1_DEF, 'Comprobante cuando lleva UN SOLO número (redactado en singular). Mismos comodines']
];

// ============================================================
// SETUP — correr una sola vez
// ============================================================
function crearHojas(){
  var ss = SpreadsheetApp.getActive();

  var v = hoja_(ss, SH_VENTAS);
  if (v.getLastRow() === 0) {
    v.appendRow(COLS_VENTAS);
    v.getRange(1,1,1,COLS_VENTAS.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    v.setFrozenRows(1);
    v.setColumnWidth(2, 200); v.setColumnWidth(3, 180);
  }
  // Columna Numeros como texto plano, siempre. Sin esto, Sheets puede leer
  // "1, 3, 225" como fecha o número y esa venta pierde sus números.
  var iNumV = v.getRange(1,1,1,v.getLastColumn()).getValues()[0].indexOf('Numeros');
  if (iNumV >= 0) v.getRange(1, iNumV + 1, v.getMaxRows(), 1).setNumberFormat('@');

  var c = hoja_(ss, SH_CONFIG);
  if (c.getLastRow() === 0) {
    c.appendRow(['Clave','Valor','Explicación']);
    c.getRange(1,1,1,3).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    c.setFrozenRows(1);
    c.setColumnWidth(2, 260); c.setColumnWidth(3, 380);
  }
  // Agrega solo las claves que falten: sirve para reparar planillas viejas
  // sin pisar los valores que ya cargaste.
  var yaEstan = {};
  var dc = c.getDataRange().getValues();
  for (var i = 1; i < dc.length; i++){ if (dc[i][0]) yaEstan[String(dc[i][0]).trim()] = true; }
  CONFIG_DEF.forEach(function(r){ if (!yaEstan[r[0]]) c.appendRow(r); });

  var d = hoja_(ss, SH_VEND);
  if (d.getLastRow() === 0) {
    d.appendRow(['Nombre','Activo']);
    d.getRange(1,1,1,2).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    d.setFrozenRows(1);
    d.appendRow(['Manuel','SI']);
  }

  var g = hoja_(ss, SH_GAN);
  if (g.getLastRow() === 0) {
    g.appendRow(COLS_GAN);
    g.setFrozenRows(1);
  } else {
    // Planilla vieja: agrega al final las columnas que falten, sin tocar los datos
    var hg = g.getRange(1, 1, 1, g.getLastColumn()).getValues()[0];
    COLS_GAN.forEach(function(col){
      if (hg.indexOf(col) === -1){
        g.getRange(1, g.getLastColumn() + 1).setValue(col);
        hg.push(col);
      }
    });
  }
  g.getRange(1,1,1,g.getLastColumn()).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');

  SpreadsheetApp.getUi().alert(
    'Listo.\n\nAhora:\n1) Cargá los vendedores en la hoja "Vendedores".\n' +
    '2) Cambiá el "token" en la hoja "Config".\n' +
    '3) Implementar > Nueva implementación > Aplicación web.'
  );
}

function hoja_(ss, nombre){
  return ss.getSheetByName(nombre) || ss.insertSheet(nombre);
}

// ============================================================
// ENDPOINTS
// ============================================================
function doGet(e){
  try{
    var p = e && e.parameter ? e.parameter : {};
    if (!tokenOk_(p.token)) return json_({ok:false, error:'Clave incorrecta'});
    return json_({ok:true, estado: leerEstado_()});
  }catch(err){
    return json_({ok:false, error:String(err)});
  }
}

function doPost(e){
  var lock = LockService.getScriptLock();
  try{
    var body = JSON.parse(e.postData.contents);
    if (!tokenOk_(body.token)) return json_({ok:false, error:'Clave incorrecta'});

    lock.waitLock(25000);

    var r = {ok:true};
    if (body.action === 'push')        r = pushVentas_(body.ops || []);
    else if (body.action === 'anular') r = anular_(body.id);
    else if (body.action === 'ganador')r = guardarGanador_(body.ganador);
    else if (body.action === 'anularGanador') r = anularGanador_(body.ganador);
    else if (body.action === 'estado') r = {ok:true};
    else return json_({ok:false, error:'Acción desconocida: ' + body.action});

    r.estado = leerEstado_();
    return json_(r);
  }catch(err){
    return json_({ok:false, error:String(err)});
  }finally{
    try{ lock.releaseLock(); }catch(_){}
  }
}

// ============================================================
// LÓGICA
// ============================================================
function pushVentas_(ops){
  var sh = SpreadsheetApp.getActive().getSheetByName(SH_VENTAS);
  var datos = sh.getDataRange().getValues();
  var disp  = sh.getDataRange().getDisplayValues();
  var head = datos[0];
  var iID = head.indexOf('ID'), iNum = head.indexOf('Numeros'), iAnu = head.indexOf('Anulado');

  // La columna Numeros SIEMPRE en formato texto
  sh.getRange(1, iNum + 1, sh.getMaxRows(), 1).setNumberFormat('@');

  var total = totalNumeros_();

  // índice de número -> {id, vendedor, nombre}
  var ocupados = {};
  var filaDe = {};
  var normalizadas = 0;
  for (var f = 1; f < datos.length; f++){
    var id = String(datos[f][iID]);
    if (!id) continue;
    filaDe[id] = f + 1;
    if (String(datos[f][iAnu]).toUpperCase() === 'SI') continue;

    var nn = numsDeCelda_(disp[f][iNum], datos[f][iNum], total);

    // Auto-reparación: si la celda no está guardada como texto plano, se
    // reescribe con apóstrofo. Sale gratis porque ya estamos recorriendo la
    // hoja con el lock tomado, y así se va limpiando sola en cada venta.
    if (nn.length && String(disp[f][iNum]).trim() !== nn.join(', ')){
      sh.getRange(f + 1, iNum + 1).setValue(textoNums_(nn));
      normalizadas++;
    }

    nn.forEach(function(n){
      ocupados[String(n)] = {id:id, vendedor:datos[f][head.indexOf('Vendedor')], nombre:datos[f][head.indexOf('Nombre')]};
    });
  }

  var conflictos = [], nuevas = 0;

  ops.forEach(function(o){
    var nums = (o.nums || []).map(function(n){ return parseInt(n, 10); })
                             .filter(function(n){ return n > 0; });

    nums.forEach(function(n){
      var ya = ocupados[String(n)];
      if (ya && ya.id !== String(o.id)){
        conflictos.push({numero: n, vendedor: ya.vendedor, nombre: ya.nombre});
      }
    });

    var fila = [
      o.id, textoNums_(nums), o.nombre || '', o.tel || '', o.pago || '',
      Number(o.monto) || 0, o.vend || '', o.ts ? new Date(o.ts) : new Date(), ''
    ];

    var existente = filaDe[String(o.id)];
    if (existente){
      sh.getRange(existente, 1, 1, fila.length).setValues([fila]);
    } else {
      sh.appendRow(fila);
      filaDe[String(o.id)] = sh.getLastRow();
      nuevas++;
    }
    nums.forEach(function(n){ ocupados[String(n)] = {id:String(o.id), vendedor:o.vend, nombre:o.nombre}; });
  });

  return {ok:true, guardadas: ops.length, nuevas: nuevas, conflictos: conflictos, normalizadas: normalizadas};
}

function anular_(id){
  var sh = SpreadsheetApp.getActive().getSheetByName(SH_VENTAS);
  var datos = sh.getDataRange().getValues();
  var iID = datos[0].indexOf('ID'), iAnu = datos[0].indexOf('Anulado');
  for (var f = 1; f < datos.length; f++){
    if (String(datos[f][iID]) === String(id)){
      sh.getRange(f + 1, iAnu + 1).setValue('SI');
      return {ok:true, anulada:id};
    }
  }
  return {ok:false, error:'No se encontró la venta ' + id};
}

function guardarGanador_(g){
  if (!g) return {ok:false, error:'Falta el ganador'};
  var sh = SpreadsheetApp.getActive().getSheetByName(SH_GAN);
  var datos = sh.getDataRange().getValues();
  var iAnu = datos[0].indexOf('Anulado');

  // Un premio anulado se puede volver a sortear: solo bloquea el vigente
  for (var f = 1; f < datos.length; f++){
    if (iAnu >= 0 && String(datos[f][iAnu]).toUpperCase() === 'SI') continue;
    if (String(datos[f][0]) === String(g.premio)) return {ok:false, error:'Ese premio ya estaba sorteado'};
  }

  sh.appendRow([g.premio, g.num, g.nombre || '', g.tel || '', g.vend || '', new Date(), '', '', '']);
  return {ok:true};
}

// Marca el ganador como anulado. No borra la fila: queda para auditar.
// g.vuelve === false  =>  ese número no participa más de ningún premio.
function anularGanador_(g){
  if (!g || !g.premio) return {ok:false, error:'Falta el premio a anular'};
  var sh = SpreadsheetApp.getActive().getSheetByName(SH_GAN);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

  // Planilla vieja: creamos las columnas que falten al vuelo
  ['Anulado','VuelveAlBolillero','AnuladoEl'].forEach(function(col){
    if (head.indexOf(col) === -1){ sh.getRange(1, sh.getLastColumn() + 1).setValue(col); head.push(col); }
  });
  var iAnu = head.indexOf('Anulado'), iVue = head.indexOf('VuelveAlBolillero'), iCua = head.indexOf('AnuladoEl');

  var datos = sh.getDataRange().getValues();
  for (var f = datos.length - 1; f >= 1; f--){          // del más nuevo al más viejo
    if (String(datos[f][0]) !== String(g.premio)) continue;
    if (String(datos[f][iAnu] || '').toUpperCase() === 'SI') continue;
    sh.getRange(f + 1, iAnu + 1).setValue('SI');
    sh.getRange(f + 1, iVue + 1).setValue(g.vuelve === false ? 'NO' : 'SI');
    sh.getRange(f + 1, iCua + 1).setValue(new Date() + (g.por ? ' — ' + g.por : ''));
    return {ok:true, anulado:{premio:g.premio, num:Number(datos[f][1])}};
  }
  return {ok:false, error:'No hay un ganador vigente para "' + g.premio + '"'};
}

// ============================================================
// LECTURA
// ============================================================

/**
 * Saca la lista de números de la celda "Numeros".
 *
 * Sheets convierte lo que se escribe: "8, 19, 25" queda como texto, pero
 * "148" lo guarda como el NÚMERO 148. Las dos son ventas válidas y hay que
 * leer las dos igual. Lo que sí no se puede reconstruir es una celda que
 * quedó como fecha o como un número que no puede ser de esta rifa: ahí se
 * devuelve vacío para que la app lo marque en vez de inventar.
 */
function numsDeCelda_(display, raw, total){
  var max = total || 100000;

  if (raw instanceof Date) return [];

  // Venta de un solo número: Sheets la guarda como número y está perfecta
  if (typeof raw === 'number'){
    return (raw > 0 && raw === Math.floor(raw) && raw <= max) ? [raw] : [];
  }

  var txt = String(display == null || display === '' ? (raw || '') : display);
  var partes = txt.match(/\d+/g) || [];
  var vistos = {}, out = [];
  partes.forEach(function(p){
    var n = parseInt(p, 10);            // "0225" -> 225
    if (!(n > 0) || n > max || vistos[n]) return;
    vistos[n] = true;
    out.push(n);
  });
  return out;
}

// Cuántos números tiene la rifa, para validar rangos al leer las celdas
function totalNumeros_(){
  return Number(cfgObj_().totalNumeros) || 100000;
}

// El apóstrofo inicial es la única forma en que Sheets promete no
// reinterpretar el contenido. No se ve en la celda ni queda en el valor.
function textoNums_(nums){
  return "'" + nums.join(', ');
}

function leerEstado_(){
  var ss = SpreadsheetApp.getActive();

  // --- ventas ---
  var sh = ss.getSheetByName(SH_VENTAS);
  var d = sh.getDataRange().getValues();
  var dv = sh.getDataRange().getDisplayValues();
  var h = d[0], ops = [];
  var iN = h.indexOf('Numeros');
  var maxNum = totalNumeros_();
  for (var f = 1; f < d.length; f++){
    if (String(d[f][h.indexOf('Anulado')]).toUpperCase() === 'SI') continue;
    if (!d[f][h.indexOf('ID')]) continue;
    var fecha = d[f][h.indexOf('Fecha')];
    var nums = numsDeCelda_(dv[f][iN], d[f][iN], maxNum);
    ops.push({
      id: String(d[f][h.indexOf('ID')]),
      nums: nums,
      fila: f + 1,
      crudo: String(dv[f][iN] || ''),   // para poder mostrar el problema si nums quedó vacío
      nombre: String(d[f][h.indexOf('Nombre')]),
      tel: String(d[f][h.indexOf('Telefono')]),
      pago: String(d[f][h.indexOf('Pago')]),
      monto: Number(d[f][h.indexOf('Monto')]) || 0,
      vend: String(d[f][h.indexOf('Vendedor')]),
      ts: fecha instanceof Date ? fecha.getTime() : Date.now()
    });
  }

  // --- config ---
  var cfg = cfgObj_();
  var precios = String(cfg.precios || '1=10000').split(';').map(function(x){
    var p = x.split('=');
    return {c: Number(String(p[0]).trim()), p: Number(String(p[1]).trim())};
  }).filter(function(x){ return x.c > 0; });

  // --- vendedores ---
  var vs = ss.getSheetByName(SH_VEND).getDataRange().getValues();
  var vendedores = [];
  for (var i = 1; i < vs.length; i++){
    if (vs[i][0] && String(vs[i][1]).toUpperCase() !== 'NO') vendedores.push(String(vs[i][0]).trim());
  }

  // --- ganadores ---
  var gs = ss.getSheetByName(SH_GAN).getDataRange().getValues();
  var iGAnu = gs[0].indexOf('Anulado'), iGVue = gs[0].indexOf('VuelveAlBolillero');
  var ganadores = [], excluidos = [];
  for (var j = 1; j < gs.length; j++){
    if (!gs[j][0]) continue;
    if (iGAnu >= 0 && String(gs[j][iGAnu]).toUpperCase() === 'SI'){
      // Ganador anulado: solo queda afuera si al re-sortear se pidió dejarlo afuera
      if (iGVue >= 0 && String(gs[j][iGVue]).toUpperCase() === 'NO') excluidos.push(Number(gs[j][1]));
      continue;
    }
    ganadores.push({premio:String(gs[j][0]), num:Number(gs[j][1]), nombre:String(gs[j][2]), tel:String(gs[j][3]), vend:String(gs[j][4])});
  }

  return {
    ops: ops,
    vendedores: vendedores,
    ganadores: ganadores,
    excluidos: excluidos,
    config: {
      nombreRifa: String(cfg.nombreRifa || 'Rifa del Club'),
      total: Number(cfg.totalNumeros) || 300,
      precios: precios,
      extra: Number(cfg.precioExtra) || 0,
      premios: String(cfg.premios || '').split('|').map(function(x){ return x.trim(); }).filter(String),
      abierta: String(cfg.ventaAbierta || 'SI').toUpperCase() !== 'NO',
      msgWa: String(cfg.msgWhatsapp || MSG_WA_DEF),
      msgWa1: String(cfg.msgWhatsapp1 || MSG_WA_1_DEF)
    },
    servidor: new Date().getTime()
  };
}

function cfgObj_(){
  var d = SpreadsheetApp.getActive().getSheetByName(SH_CONFIG).getDataRange().getValues();
  var o = {};
  for (var f = 1; f < d.length; f++){ if (d[f][0]) o[String(d[f][0]).trim()] = d[f][1]; }
  return o;
}

function tokenOk_(t){
  var esperado = String(cfgObj_().token || '').trim();
  if (!esperado) return true;               // sin token configurado, queda abierto
  return String(t || '').trim() === esperado;
}

function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// EXTRA: menú en la planilla
// ============================================================
function onOpen(){
  SpreadsheetApp.getUi().createMenu('Rifa')
    .addItem('Crear / reparar hojas', 'crearHojas')
    .addItem('Revisar columna Números', 'repararNumeros')
    .addItem('Ver resumen', 'mostrarResumen')
    .addToUi();
}

/**
 * Pone la columna Numeros en formato texto y reescribe cada celda con lo que
 * se ve, para que Sheets no la vuelva a interpretar. Avisa cuáles no pudo
 * recuperar (las que quedaron guardadas como fecha o como número).
 */
function repararNumeros(){
  var sh = SpreadsheetApp.getActive().getSheetByName(SH_VENTAS);
  var d  = sh.getDataRange().getValues();
  var dv = sh.getDataRange().getDisplayValues();
  var iNum = d[0].indexOf('Numeros');
  var iID  = d[0].indexOf('ID');

  sh.getRange(1, iNum + 1, sh.getMaxRows(), 1).setNumberFormat('@');

  var total = totalNumeros_();
  var rotas = [], arregladas = 0;
  for (var f = 1; f < d.length; f++){
    if (!d[f][iID]) continue;
    var nums = numsDeCelda_(dv[f][iNum], d[f][iNum], total);
    if (!nums.length){
      rotas.push('Fila ' + (f + 1) + '  (' + d[f][iID] + ')  →  se ve: "' + dv[f][iNum] + '"');
      continue;
    }
    if (nums.join(', ') !== String(dv[f][iNum]).trim()){
      sh.getRange(f + 1, iNum + 1).setValue(textoNums_(nums));
      arregladas++;
    }
  }

  var msg = 'Columna Números puesta en formato texto.\n\n' +
            'Filas normalizadas: ' + arregladas + '\n';
  if (rotas.length){
    msg += '\n⚠ Estas filas no se pudieron recuperar. Escribí a mano los números ' +
           'separados por coma y volvé a correr esto:\n\n' + rotas.join('\n');
  } else {
    msg += '\nNo hay filas con problemas.';
  }
  SpreadsheetApp.getUi().alert(msg);
}

function mostrarResumen(){
  var e = leerEstado_();
  var vendidos = 0, cobrado = 0, adeudado = 0, porVend = {};
  e.ops.forEach(function(o){
    vendidos += o.nums.length;
    if (String(o.pago).toUpperCase() === 'DEBE') adeudado += o.monto; else cobrado += o.monto;
    porVend[o.vend] = (porVend[o.vend] || 0) + o.nums.length;
  });
  var txt = 'Vendidos: ' + vendidos + ' de ' + e.config.total +
            '\nCobrado: $' + cobrado.toLocaleString('es-AR') +
            '\nA cobrar: $' + adeudado.toLocaleString('es-AR') + '\n\nPor vendedor:\n';
  Object.keys(porVend).forEach(function(k){ txt += '  ' + k + ': ' + porVend[k] + '\n'; });
  SpreadsheetApp.getUi().alert(txt);
}
