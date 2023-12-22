/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @file Evita que el usuario guarde un record de tipo Invoice, Vendor Credit o Inventory adjustment con un numero
 * mayor al stock disponible de pedimentos
 */
define(['N/currentRecord', 'N/search', 'N/record', 'N/ui/message'],
    /**
     * @param{currentRecord} currentRecord
     * @param{search} search
     */
    function (currentRecord, search, record, message) {

        function pageInit(scriptContext) {
            console.log('Iniciando las validaciones')
        }
        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            var objMsg = new Object();
            try {
                console.log('Iniciando la validacion');
                console.log(JSON.stringify(scriptContext));
                var objRecord = currentRecord.get();
                console.log({ title: 'objRecord', details: JSON.stringify(objRecord) });
                var recType = objRecord.type;
                var location = new Object();
                if (recType == record.Type.INVOICE || recType == record.Type.ITEM_FULFILLMENT) {
                    sublista = 'item';
                    campo_cantidad = 'quantity';
                    campo_rate = 'rate';
                    location.value = objRecord.getValue({ fieldId: 'location' })
                    location.text = objRecord.getText({ fieldId: 'location' })
                }

                if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                    sublista = 'inventory';
                    campo_cantidad = 'adjustqtyby';
                    campo_rate = 'unitcost';
                }

                var numLines = objRecord.getLineCount({ sublistId: sublista });

                // Arreglos vacios los cuales indican que articulos se buscara su pedimento cuando se cree y edite las lineas
                var array_items = new Array();
                var array_items_not_ped = new Array();

                var qtyPed = 0;
                var noMasterPed = 0;
                var suma_cantidad = 0;
                var suma_pedimento = '';
                var arrPed = [];
                // Lineas con los ids de articulos, pedimentos y cantidades 
                var arrLines = [];
                var arrIdLotSerie = []
                // Recorrido de las lineas para obtener la informacion para su validacion
                for (var i = 0; i < numLines; i++) {
                    var lineToGetData = objRecord.selectLine({ sublistId: sublista, line: i });
                    console.log({ title: 'lineToGetData', details: lineToGetData });
                    var contiene_ped = lineToGetData.getCurrentSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_contains' });
                    console.log(contiene_ped)

                    // Verifica si es candidato para realizar las validaciones de pedimentos
                    if (contiene_ped) {
                        qtyPed++;
                        var items = objRecord.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i });
                        // var itemName = objRecord.getSublistText({ sublistId: sublista, fieldId: 'item', line: i });
                        var itemName = objRecord.getSublistValue({ sublistId: sublista, fieldId: 'itemname', line: i });
                        var cantidad_campo = parseFloat(lineToGetData.getCurrentSublistValue({ sublistId: sublista, fieldId: campo_cantidad }));
                        var pedimento_campo = lineToGetData.getCurrentSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_numero_pedimento' }) || '';
                        var inventorydetailavail = lineToGetData.getCurrentSublistValue({ sublistId: sublista, fieldId: 'inventorydetailavail' }) || '';
                        var locationLine = {};
                        locationLine.value = objRecord.getSublistValue({ sublistId: sublista, fieldId: 'location', line: i })
                        locationLine.text = objRecord.getSublistText({ sublistId: sublista, fieldId: 'location', line: i })
                        console.log(items + ' tiene el pedimento de ' + pedimento_campo)
                        console.log({ title: 'inventorydetailavail', details: inventorydetailavail });

                        // Si este tiene el detalle de inventario disponible debera dejar continuar con la obtencion de datos por detalle de inventario
                        if (inventorydetailavail === 'T') {
                            var inventoryDetail = lineToGetData.getCurrentSublistSubrecord({ sublistId: sublista, fieldId: 'inventorydetail' });
                            var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: 'inventoryassignment' });
                            console.log({ title: 'countInventoryDetail', details: countInventoryDetail });
                            var arrInvDetail = []
                            for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
                                console.log({ title: 'inventoryDetail', details: inventoryDetail });
                                var invDetNumId = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorydetail', line: indexInvDet })
                                var serialLotId = parseInt(inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: indexInvDet }))
                                var invDetQty = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: indexInvDet })
                                arrInvDetail.push({ invDetNumId, serialLotId, invDetQty })
                            }
                            arrIdLotSerie = arrIdLotSerie.concat(arrInvDetail)
                            console.log({ title: 'Data to Inventory Detail:', details: arrInvDetail });
                            console.log({ title: 'ID to inventory detail:', details: arrIdLotSerie });
                            // Se crea un objeto auxiliar, para introducir de manera individual las cantidades utilizadas por linea de detalle de inventario


                            // Se coloca dentro del arreglo de objetos para que este introduzca la linea que se vera afectada.
                            arrInvDetail.forEach((invDetail) => {
                                let objAuxForLine = {
                                    item: items,
                                    itemName: itemName,
                                    qtyLine: 0,
                                    noPedimento: pedimento_campo || '',
                                    locationLine: locationLine
                                }
                                objAuxForLine.qtyLine = invDetail.invDetQty;
                                objAuxForLine.serialLotId = invDetail.serialLotId;
                                objAuxForLine.invDetNumId = invDetail.invDetNumId;
                                arrLines.push(objAuxForLine);
                            })
                            array_items.push(items);
                        } else {
                            // En caso contrario realizara un filtro para que de esta forma no se busque tambien el numero de serie
                            arrLines.push({
                                item: items,
                                itemName: itemName,
                                qtyLine: cantidad_campo || 0,
                                noPedimento: pedimento_campo || '',
                                locationLine: locationLine
                            })
                            array_items.push(items);
                        }
                        suma_pedimento = suma_pedimento + pedimento_campo;
                        suma_cantidad = suma_cantidad + cantidad_campo;
                        //Objeto principal para la validacion de las cantidades

                        // if (pedimento_campo === '') {
                        //     noMasterPed++;
                        //     array_items_not_ped.push(items)
                        // } else {
                        //     arrPed.push(pedimento_campo)
                        // }
                    }
                }

                // Obtencion de los numeros de series utilizados dentro de este ajuste de inventario 
                var lotesSeries = (arrIdLotSerie.length < 0 ? [] : getIdLotNumber(arrIdLotSerie));
                console.log({ title: 'lotesSeries', details: lotesSeries });
                console.log({ title: 'arrLines', details: arrLines });
                console.log({ title: 'array_items', details: array_items });
                console.log({ title: 'array_items_not_ped', details: array_items_not_ped });
                console.log({ title: 'Ubicacion', details: location });
                console.log('suma_pedimento: ' + suma_pedimento);
                console.log(suma_cantidad);

                // Mapeo de las lineas con su respectivo numero de serie
                if (lotesSeries.length > 0) {
                    arrLines.map(lineaPib => {
                        let lineaEncontrada = lotesSeries.find(lotSer => lotSer.lotId === lineaPib.serialLotId) || null;
                        console.log({ title: 'lineaEncontrada', details: lineaEncontrada });
                        if (lineaEncontrada) {
                            lineaPib.serieLote = lineaEncontrada.inventorynumber
                        }
                        return lineaPib;
                    })
                    console.log({ title: '🟢Lineas modificadas:', details: arrLines });
                }
                // if (recType == record.Type.INVOICE || recType == record.Type.VENDOR_CREDIT || (suma_cantidad < 0 && suma_pedimento === '')) {
                if ((recType == record.Type.ITEM_FULFILLMENT)) {
                    suma_cantidad = suma_cantidad * (-1);
                    var dataItem = [];
                    for (var z = 0; z < array_items.length; z++) {
                        if (dataItem.indexOf(array_items[z]) == -1) {
                            dataItem.push(array_items[z]);
                        }
                    }

                    console.log({ title: 'ID articulos a buscar:', details: dataItem });

                    if (dataItem.length > 0) {
                        // Verifica si se coloco ya un pedimento, si no lo ha colocado entonces hace la validacion de la cantidad inicial
                        if (suma_pedimento === '') {
                            var filtroHistorico = [];

                            arrLines.forEach((linePibote, index) => {
                                var filtroPib = []
                                filtroPib.push(['custrecord_exf_ped_item', search.Operator.ANYOF, linePibote.item])
                                if (linePibote.serieLote) {
                                    filtroPib.push("AND", ["custrecord_efx_ped_serial_lote", search.Operator.IS, linePibote.serieLote])
                                }
                                filtroHistorico.push(filtroPib)
                                if ((arrLines.length - 1) !== index) {
                                    filtroHistorico.push('OR')
                                }
                            });
                            console.log({ title: 'filtroHistorico', details: filtroHistorico });
                            // Busca a partir de los id de los articulos y la ubicacion establecida con anterioridad
                            var buscaPed = search.create({
                                type: 'customrecord_efx_ped_master_record',
                                filters: [
                                    ['isinactive', search.Operator.IS, 'F']
                                    , 'AND',
                                    ['custrecord_efx_ped_available', search.Operator.ISNOT, '0.0']
                                    , 'AND',
                                    filtroHistorico
                                ],
                                columns: [
                                    search.createColumn({ name: 'internalid' }),
                                    search.createColumn({ name: 'custrecord_exf_ped_item' }),
                                    search.createColumn({ name: 'custrecord_efx_ped_number' }),
                                    search.createColumn({ name: 'custrecord_efx_ped_available' }),
                                    search.createColumn({ name: 'custrecord_efx_ped_serial_lote' }),
                                ],
                            });
                            var ejecutar_pedimento = buscaPed.run();
                            var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);
                            var stok_total = 0;
                            var masterPed = [];
                            var masterItems = [];
                            for (var x = 0; x < resultado_pedimento.length; x++) {
                                var itemMaster = resultado_pedimento[x].getValue({ name: 'custrecord_exf_ped_item' }) || 'NA';
                                var noPedMaster = resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_number' }) || 'NA';
                                var serieLoteMP = resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_serial_lote' }) || '';
                                var cantidad_av = parseFloat(resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_available' })) || 0;
                                if (itemMaster !== 'NA' && noPedMaster !== 'NA' && cantidad_av > 0) {
                                    masterPed.push({
                                        item: itemMaster,
                                        qtyAvailable: cantidad_av,
                                        noPedimento: noPedMaster,
                                        serieLoteMP: serieLoteMP
                                    })
                                    masterItems.push(itemMaster);
                                }
                                stok_total = stok_total + cantidad_av;
                            }
                            console.log({ title: 'masterItems', details: masterItems });
                            masterItems = [... new Set(masterItems)]
                            console.log({ title: 'masterItems', details: masterItems });
                            console.log({ title: 'Lineas solicitadas:', details: arrLines });
                            console.log({ title: 'Master Ped Available:', details: masterPed });
                            console.log(stok_total);
                            console.log(suma_cantidad);
                            if (masterItems.length === array_items.length) {
                                var mensaje = validaLines(arrLines, masterPed, 1);
                                if (mensaje.length === 0) {
                                    // return false

                                    return true
                                } else {
                                    objMsg.status = 'NOT_QTY'
                                    objMsg.message = mensaje
                                    createMessage(objMsg);
                                }
                            } else {
                                var mensaje = validaLines(arrLines, masterPed, 0);
                                objMsg.status = 'NOT_QTY'
                                objMsg.message = mensaje
                                createMessage(objMsg);
                            }
                        } else {
                            // Si ya se tiene un pedimento tiene que hacer la validacion con respecto al que se coloco
                            let idTran = objRecord.id;
                            console.log({ title: 'Data to search:', details: { idTran, array_items, arrPed } });
                            var resultToLine = getHistoricalMovement(idTran, array_items, arrPed)
                        }
                    } else {
                        // return false;
                        return true;
                    }
                } else {
                    // return false;
                    return true;
                }

                return false;
            } catch (e) {
                console.error({ title: 'Error saveRecord', details: e });
                objMsg.status = 'ERROR'
                objMsg.mesage = e
                createMessage(objMsg);
            }
        }
        function getIdLotNumber(arrIdLotSerie) {
            try {
                var filtros = []
                arrIdLotSerie.forEach((lotSerie, index) => {
                    if (index === (arrIdLotSerie.length - 1)) {
                        filtros.push(["inventorynumber.internalid", "anyof", lotSerie.serialLotId], "AND", ["internalid", "anyof", lotSerie.invDetNumId])
                    } else {
                        filtros.push(["inventorynumber.internalid", "anyof", lotSerie.serialLotId], "AND", ["internalid", "anyof", lotSerie.invDetNumId], 'OR')
                    }
                })
                console.log({ title: 'arrIdLotSerie', details: arrIdLotSerie });
                var inventorydetailSearchObj = search.create({
                    type: "inventorydetail",
                    filters: filtros,
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "inventorynumber", sort: search.Sort.ASC, label: " Number" }),
                            search.createColumn({ name: "binnumber", label: "Bin Number" }),
                            search.createColumn({ name: "quantity", label: "Quantity" }),
                            search.createColumn({ name: "itemcount", label: "Item Count" }),
                            search.createColumn({ name: "expirationdate", label: "Expiration Date" }),
                            search.createColumn({ name: "unit", join: "transaction", label: "Units" })
                        ]
                });
                var searchResultCount = inventorydetailSearchObj.runPaged().count;
                var dataResults = inventorydetailSearchObj.runPaged({ pageSize: 1000 });

                console.log({ title: 'Numero de resultados', details: searchResultCount });
                var results = new Array();
                // Obtain th data for saved search
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var searchPage = dataResults.fetch({ index: thePageRanges[i].index });
                    searchPage.data.forEach(function (result) {
                        let inventorynumber = result.getText({ name: 'inventorynumber' })
                        let lotId = parseInt(result.getValue({ name: 'inventorynumber' }))
                        let objInventoryDetail = arrIdLotSerie.find((invDet) => invDet.serialLotId === lotId) || null;
                        if (objInventoryDetail) {
                            results.push({ lotId, inventorynumber })
                        }
                        // arrIdLotSerie.map(idLoteSerie => {
                        //     if (idLoteSerie.serialLotId === lotId) {
                        //         results.push({ inventorynumber, lotId })
                        //     }
                        // })


                        return true;
                    });
                }
                console.log({ title: 'Result LOT', details: results });
                return results;
            } catch (e) {
                console.error({ title: 'Error getIdLotNumber:', details: e });
            }
        }
        function validaLines(arrLines, arrMaster, validCase) {
            try {
                var mensaje = ''
                arrLines.map(line => {
                    console.log({ title: 'line', details: line });
                    var succSearch = null;
                    switch (validCase) {
                        case 0:
                            succSearch = arrMaster.some(master => master.item === line.item && master.qtyAvailable >= line.qtyLine) || null;
                            mensaje = (succSearch === null ? '<br/><b>' + line.itemName + '</b> no se puede abastecer la cantidad de <b>' + line.qtyLine + '</b>' : '')
                            break;
                        case 1:
                            var arrMaster2 = arrMaster.filter(objFiltrado => objFiltrado.item === line.item)
                            succSearch = arrMaster2.reduce((max, obj) => (obj.qtyAvailable > max.qtyAvailable) ? obj : max, arrMaster2[0]);
                            console.log({ title: 'succSearch', details: succSearch });
                            mensaje = (succSearch.qtyAvailable - line.qtyLine < 0 ? '<br/><b>' + line.itemName + '</b> no se puede abastecer la cantidad de <b>' + line.qtyLine + '</b> faltan la cantidad de <b>' + Math.abs(succSearch.qtyAvailable - line.qtyLine) + '</b>' : '')
                            break;
                    }
                })
                return mensaje;
            } catch (e) {
                console.error({ title: 'Error validaLines:', details: e });
            }
        }
        function createMessage(objMsg) {
            try {
                var showMsgCust = {
                    title: "",
                    message: '',
                    type: ''
                }
                switch (objMsg.status) {
                    case 'NOT_QTY':
                        showMsgCust.title = "Pedimentos"
                        // showMsgCust.message = 'Por favor asegurese de que tenga stock disponible en sus pedimentos.\nStock Disponible: ' + 'stok_total' + '.' + '\nCantidad solicitada en la transaccion: ' + 'suma_cantidad' + '. Se necesita un stock adicional de ' + 'falta' + ' unidades.'
                        showMsgCust.message = 'Por favor asegurese de que tenga stock disponible en sus pedimentos.' + objMsg.message
                        showMsgCust.type = message.Type.WARNING
                        break;
                    case 'ERROR':
                        showMsgCust.title = "ERROR Script"
                        showMsgCust.message = 'Error script: ' + objMsg.e
                        showMsgCust.type = message.Type.ERROR
                        break;
                    default:
                        showMsgCust.title = "Error no identificado."
                        showMsgCust.message = 'Consulte a su administrador'
                        showMsgCust.type = message.Type.ERROR
                        break;
                }
                var myMsg = message.create(showMsgCust);
                myMsg.show();
            } catch (e) {
                console.error({ title: 'Error createMessage:', details: e });
            }
        }
        function getHistoricalMovement(idTran, arrItems, arrPed, location) {
            try {
                let filterPed = [];
                arrPed.forEach((pedido, index) => {
                    if (index === (arrPed.length - 1)) {
                        filterPed.push(["custrecord_efx_ped_numpedimento", "is", pedido]);
                    } else {
                        filterPed.push(["custrecord_efx_ped_numpedimento", "is", pedido], "OR")
                    }
                })
                console.log({ title: 'filterPed', details: filterPed });
                var searchObj = search.create({
                    type: "customrecord_efx_ped_record_history",
                    filters:
                        [
                            ["custrecord_efx_ped_related_tran", "anyof", idTran],
                            "AND",
                            ["custrecord_efx_ped_h_item", "anyof", arrItems],
                            "AND",
                            [filterPed]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custrecord_efx_ped_h_pedimento", label: "Pedimento" }),
                            search.createColumn({ name: "custrecord_efx_ped_related_tran", label: "Transacción Relacionada" }),
                            search.createColumn({ name: "custrecord_efx_ped_numpedimento", label: "Numero de Pedimento" }),
                            search.createColumn({ name: "custrecord_efx_ped_h_item", label: "Artículo" }),
                            search.createColumn({ name: "custrecord_efx_ped_h_quantity", label: "Cantidad" }),
                            search.createColumn({ name: "custrecord_efx_ped_h_location", label: "Ubicacion" })
                        ]
                });
                var searchResultCount = searchObj.runPaged().count;
                console.log("No. resultados del historico: ", searchResultCount);
                // let columns = searchObj.columns;
                // console.log({ title: 'columns', details: columns });

                var arrHistorico = [];
                var objGroupHistorico = {};
                var dataResults = searchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var thepageData = dataResults.fetch({ index: thePageRanges[i].index });
                    thepageData.data.forEach(function (result) {
                        let item = result.getValue({ name: "custrecord_efx_ped_h_item" });
                        if (!objGroupHistorico[`ITEM-${item}`]) {
                            objGroupHistorico[`ITEM-${item}`] = [];
                        }
                        objGroupHistorico[`ITEM-${item}`].push({
                            pedimento: {
                                value: result.getValue({ name: "custrecord_efx_ped_h_pedimento" }),
                                text: result.getText({ name: "custrecord_efx_ped_h_pedimento" })
                            },
                            tranRelated: {
                                value: result.getValue({ name: "custrecord_efx_ped_related_tran" }),
                                text: result.getText({ name: "custrecord_efx_ped_related_tran" })
                            },
                            noPed: result.getValue({ name: "custrecord_efx_ped_numpedimento" }),
                            item: {
                                value: result.getValue({ name: "custrecord_efx_ped_h_item" }),
                                text: result.getText({ name: "custrecord_efx_ped_h_item" })
                            },
                            last_qty: parseFloat(result.getValue({ name: "custrecord_efx_ped_h_quantity" }) || '0.0'),
                            qtyAvailable: 0,
                            location: {
                                value: result.getValue({ name: "custrecord_efx_ped_h_location" }) || '',
                                text: result.getText({ name: "custrecord_efx_ped_h_location" }) || ''
                            },
                        })
                        // arrHistorico.push();
                    })
                }
                console.log({ title: 'objGroupHistorico without qtyAvailable', details: objGroupHistorico });
                objGroupHistorico = getPedimento(arrItems, location, objGroupHistorico)
                console.log({ title: 'objGroupHistorico with qty Available', details: objGroupHistorico });
                /*
                searchObj.id="customsearch1700666439521";
                searchObj.title="Obten Historial de Movimientos Pedimento - SS (copy)";
                var newSearchId = searchObj.save();
                */
            } catch (e) {
                console.error({ title: 'Error getHistoricalMovement:', details: e });
            }
        }
        function getPedimento(dataItem, location, groupHist) {
            try {
                var buscaPed = search.create({
                    type: 'customrecord_efx_ped_master_record',
                    filters: [
                        ['isinactive', search.Operator.IS, 'F']
                        , 'AND',
                        ['custrecord_efx_ped_available', search.Operator.ISNOT, '0.0']
                        , 'AND',
                        ['custrecord_exf_ped_item', search.Operator.ANYOF, dataItem],
                        "AND",
                        ["custrecord_exf_ped_location", "anyof", location.value]
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'custrecord_exf_ped_item' }),
                        search.createColumn({ name: 'custrecord_efx_ped_number' }),
                        search.createColumn({ name: 'custrecord_efx_ped_available' }),
                    ],
                });
                var ejecutar_pedimento = buscaPed.run();
                var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);
                for (var x = 0; x < resultado_pedimento.length; x++) {
                    var itemMaster = resultado_pedimento[x].getValue({ name: 'custrecord_exf_ped_item' }) || 'NA';
                    var noPedMaster = resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_number' }) || 'NA';
                    var cantidad_av = parseFloat(resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_available' })) || 0;
                    if (itemMaster !== 'NA' && noPedMaster !== 'NA' && cantidad_av > 0) {
                        groupHist
                    }
                }
            } catch (e) {
                console.error({ title: 'Error getPedimento:', details: e });
            }
        }
        return {
            pageInit: pageInit,
            saveRecord: saveRecord
        };

    });
