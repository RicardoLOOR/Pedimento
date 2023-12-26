/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @file Script para manejar entrada de pedimentos al sistema. Crea o actualiza pedimentos en el record Master de
 * pedimentos y registra el historial en record de historial
 */
define(['N/record', 'N/search'], (record, search) => {
    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} scriptContext.form - Current form
     * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = (scriptContext) => {
        log.debug({ title: 'Iniciando el script para generacion de maestro de pedimentos', details: true });
    }

    /**
     * Defines the function definition that is executed before record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */

    const beforeSubmit = (scriptContext) => {
        try {

            // var contextType = scriptContext.type;

            // switch (contextType) {
            //     case scriptContext.UserEventType.EDIT:
            //         var record_now = scriptContext.newRecord;
            //         var recType = record_now.type;

            //         var sublista = '';
            //         var campo_rate = '';
            //         var campo_cantidad = '';

            //         if (recType == record.Type.CREDIT_MEMO) {
            //             sublista = 'item';
            //             campo_cantidad = 'quantity';
            //             campo_rate = 'rate';
            //         }
            //         if (recType == record.Type.ITEM_RECEIPT) {
            //             sublista = 'item';
            //             campo_cantidad = 'quantity';
            //             campo_rate = 'rate';
            //         }
            //         if (recType == record.Type.INVENTORY_ADJUSTMENT) {
            //             sublista = 'inventory';
            //             campo_cantidad = 'adjustqtyby';
            //             campo_rate = 'unitcost';
            //         }

            //         var conteoLine = record_now.getLineCount({ sublistId: sublista });
            //         log.audit({ title: 'conteoLine', details: conteoLine })

            //         var array_pedimentoObj = [];
            //         for (var i = 0; i < conteoLine; i++) {
            //             var pedimentoObj = {
            //                 noSerie: '',
            //                 pedimento: '',
            //                 item: '',
            //                 cantidad: '',
            //                 costo: '',
            //                 total: '',
            //                 tienePedimento: '',
            //                 ubicacion: ''
            //             }


            //             pedimentoObj.tienePedimento = record_now.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_contains', line: i }) || '';
            //             log.audit({ title: 'pedimentoObj.tienePedimento', details: pedimentoObj.tienePedimento });
            //             var tipoItem = record_now.getSublistValue({ sublistId: sublista, fieldId: 'itemtype', line: i }) || '';
            //             var tipoQItem = record_now.getSublistValue({ sublistId: sublista, fieldId: 'quantity', line: i }) || '';
            //             var ubicacionLinea = record_now.getSublistValue({ sublistId: sublista, fieldId: 'location', line: i }) || '';
            //             var listaensa = [];

            //             log.audit({ title: 'tipoItem', details: tipoItem });
            //             // Validacion si tiene el check habilitado de Pedimento

            //             if (pedimentoObj.tienePedimento) {
            //                 var ItemIdAssembly = record_now.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || '';
            //                 var nameItem = record_now.getSublistText({ sublistId: sublista, fieldId: 'item', line: i }) || ''

            //                 log.audit({ title: 'ID Item', details: { ItemIdAssembly, nameItem } });
            //                 if (tipoItem == 'InvPart') {
            //                     // Obtiene los datos necesarios para generar el master
            //                     var isSerial = record_now.getSublistValue({ sublistId: sublista, fieldId: 'isserialitem', line: i });
            //                     if (isSerial) {

            //                     } else {
            //                         pedimentoObj.cantidad = parseFloat(record_now.getSublistValue({ sublistId: sublista, fieldId: campo_cantidad, line: i })) || '';
            //                     }
            //                     pedimentoObj.pedimento = record_now.getSublistValue({ sublistId: sublista, fieldId: '', line: i }) || '';
            //                     pedimentoObj.item = record_now.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || '';
            //                     pedimentoObj.costo = parseFloat(record_now.getSublistValue({ sublistId: sublista, fieldId: campo_rate, line: i })) || '';
            //                     pedimentoObj.total = parseFloat(pedimentoObj.costo) * parseFloat(pedimentoObj.cantidad);
            //                     pedimentoObj.ubicacion = ubicacionLinea;
            //                     log.audit({ title: 'pedimentoObj.pedimento', details: pedimentoObj.pedimento });
            //                     if (pedimentoObj.pedimento) {
            //                         array_pedimentoObj.push(pedimentoObj);
            //                     }
            //                 }


            //             }
            //         }
            //         break;
            //     case scriptContext.UserEventType.CREATE:
            //         var record_now = scriptContext.newRecord;
            //         var recType = record_now.type;

            //         var sublista = '';
            //         var campo_rate = '';
            //         var campo_cantidad = '';

            //         var array_pedimentoObj = [];

            //         if (recType == record.Type.ITEM_RECEIPT) {
            //             sublista = 'item';
            //             campo_cantidad = 'quantity';
            //             campo_rate = 'rate';

            //             //Ver si este receipt proviende de un inboundshipment
            //             var inb_ship_origen = record_now.getValue('inboundshipmentvalue');
            //             var validateToCreateMaster = false;
            //             //Si este receipt proviene de un inbound shipment entonces hacer la busqueda
            //             // Si este receipt proviene directo de la orden de compra entonces generará colocará los datos de Numero de pedimento
            //             if (inb_ship_origen) {
            //                 var inboundshipmentSearchObj = search.create({
            //                     type: "inboundshipment",
            //                     filters:
            //                         [
            //                             ["internalid", "anyof", inb_ship_origen]
            //                         ],
            //                     columns:
            //                         [
            //                             search.createColumn({ name: "custrecord_efx_ped_inb_clavesat", label: "Clave SAT" }),
            //                             search.createColumn({ name: "custrecord_efx_ped_inb_aduana", label: "Aduana" })
            //                         ]
            //                 });

            //                 var searchResultCount = inboundshipmentSearchObj.runPaged().count;
            //                 log.debug("inboundshipmentSearchObj result count", searchResultCount);
            //                 inboundshipmentSearchObj.run().each(function (result) {
            //                     // .run().each has a limit of 4,000 results
            //                     payl_noPedimento = result.getValue('custrecord_efx_ped_inb_clavesat');
            //                     payl_Aduana = result.getValue('custrecord_efx_ped_inb_aduana');
            //                     log.audit({ title: 'Pedimento tomado del inbound shipment: ' + payl_noPedimento, details: '' });
            //                     log.audit({ title: 'Aduana tomada del inbound shipment: ' + payl_Aduana, details: '' });
            //                     return true;
            //                 });

            //                 //Si se encuentra el valor de la aduana en el inbound shipment... (Siempre deberia existir el valor)
            //                 if (payl_Aduana) {
            //                     //Inyectar el nombre de la aduana en main body custom field
            //                     record_now.setValue('custbody_efx_ped_rec_aduana', payl_Aduana);
            //                 } else {
            //                     log.audit({ title: 'No se encuentra la aduana en el inboundshipment ', details: '' });
            //                 }

            //                 //Inyectar valor de pedimentos a todos los items y marcar la casilla si es que trae pedimentos

            //                 if (payl_noPedimento) {
            //                     //Contar cuantas lineas traeria la sublista de este recibo
            //                     var noLinRecNvo = record_now.getLineCount({ sublistId: 'item' });

            //                     log.audit({ title: 'SE VA A CREAR UN ITEM RECEIPT con este numero de lineas: ' + noLinRecNvo, details: '' });

            //                     //Por ej, considerando 3 lineas, habria que iterar cada una, marcar la casilla de pedimento
            //                     // y agregar el numero de pedimento
            //                     //Recorrer los articulos del receipt y ponerles el pedimento
            //                     for (i = 0; i < noLinRecNvo; i++) {
            //                         var itemId = record_now.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            //                         var needPedim = search.lookupFields({ type: search.Type.ITEM, id: itemId, columns: ['custitem_efx_ped_contains'] });
            //                         log.debug({ title: 'needPedim', details: needPedim });
            //                         if (needPedim.custitem_efx_ped_contains) {
            //                             record_now.setSublistValue({ sublistId: 'item', fieldId: 'custcol_efx_ped_numero_pedimento', line: i, value: payl_noPedimento });
            //                             record_now.setSublistValue({ sublistId: 'item', fieldId: 'custcol_efx_ped_contains', line: i, value: true });
            //                             validateToCreateMaster = true;
            //                         }
            //                     }
            //                 }

            //             } else {

            //                 var purchaseOrdeCreatedFrom = record_now.getValue('createdfrom');
            //                 var typeOrd = record_now.getValue('type');
            //                 var orderType = record_now.getValue('ordertype');

            //                 log.debug({ title: 'Tipos:', details: { typeOrd, orderType } });

            //                 if (purchaseOrdeCreatedFrom) {

            //                     var dataToOC = null;
            //                     log.debug({ title: 'Data to search', details: { type: search.Type.PURCHASE_ORDER } });
            //                     dataToOC = search.lookupFields({ type: search.Type.TRANSACTION, id: purchaseOrdeCreatedFrom, columns: ['custbody_efx_ped_no_pedimento_oc'] });
            //                     log.debug({ title: 'dataToOC', details: dataToOC });

            //                     var noPedimento = dataToOC.custbody_efx_ped_no_pedimento_oc;

            //                     if (noPedimento) {
            //                         //Contar cuantas lineas traeria la sublista de este recibo
            //                         var noLinRecNvo = record_now.getLineCount({ sublistId: 'item' });

            //                         log.audit({ title: 'SE VA A CREAR UN ITEM RECEIPT con este numero de lineas: ' + noLinRecNvo, details: '' });

            //                         //Por ej, considerando 3 lineas, habria que iterar cada una, marcar la casilla de pedimento y agregar el numero de pedimento
            //                         //Recorrer los articulos del receipt y ponerles el pedimento
            //                         for (i = 0; i < noLinRecNvo; i++) {
            //                             var pedimentoObj = {
            //                                 noSerie: '',
            //                                 pedimento: '',
            //                                 item: '',
            //                                 cantidad: '',
            //                                 costo: '',
            //                                 total: '',
            //                                 tienePedimento: '',
            //                                 ubicacion: ''
            //                             }

            //                             pedimentoObj.tienePedimento = record_now.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_contains', line: i }) || '';
            //                             var tipoItem = record_now.getSublistValue({ sublistId: sublista, fieldId: 'itemtype', line: i }) || '';
            //                             var itemId = record_now.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            //                             var needPedim = search.lookupFields({ type: search.Type.ITEM, id: itemId, columns: ['custitem_efx_ped_contains'] });
            //                             log.debug({ title: 'needPedim', details: needPedim });
            //                             if (needPedim.custitem_efx_ped_contains) {

            //                                 record_now.setSublistValue({ sublistId: 'item', fieldId: 'custcol_efx_ped_numero_pedimento', line: i, value: noPedimento });
            //                                 record_now.setSublistValue({ sublistId: 'item', fieldId: 'custcol_efx_ped_contains', line: i, value: true });

            //                                 pedimentoObj.item = record_now.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || '';
            //                                 pedimentoObj.pedimento = record_now.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_numero_pedimento', line: i }) || '';
            //                                 pedimentoObj.costo = parseFloat(record_now.getSublistValue({ sublistId: sublista, fieldId: campo_rate, line: i })) || '';
            //                                 pedimentoObj.ubicacion = record_now.getSublistValue({ sublistId: sublista, fieldId: 'location', line: i }) || '';

            //                                 var inventoryDetail = record_now.getSublistSubrecord({ sublistId: sublista, fieldId: 'inventorydetail', line: i });
            //                                 var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: 'inventoryassignment' });

            //                                 var arrInvDetail = []
            //                                 for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
            //                                     log.debug({ title: 'inventoryDetail', details: inventoryDetail });
            //                                     var invDetNum = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: indexInvDet })
            //                                     var invDetQty = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: indexInvDet })
            //                                     arrInvDetail.push({ invDetNum, invDetQty })
            //                                 }
            //                                 log.audit({ title: 'Data to Inventory Detail:', details: arrInvDetail });
            //                                 if (arrInvDetail.length > 0) {
            //                                     arrInvDetail.forEach(invDet => {
            //                                         var newPedObj = Object.assign({}, pedimentoObj)
            //                                         newPedObj.noSerie = invDet.invDetNum
            //                                         newPedObj.cantidad = invDet.invDetQty
            //                                         if (newPedObj.pedimento) {
            //                                             newPedObj.total = parseFloat(newPedObj.costo) * parseFloat(newPedObj.cantidad);
            //                                             array_pedimentoObj.push(newPedObj)
            //                                         }
            //                                     })
            //                                 } else {
            //                                     pedimentoObj.total = parseFloat(pedimentoObj.costo) * parseFloat(pedimentoObj.cantidad);
            //                                     pedimentoObj.cantidad = parseFloat(record_now.getSublistValue({ sublistId: sublista, fieldId: campo_cantidad, line: i })) || '';
            //                                     if (pedimentoObj.pedimento) {
            //                                         array_pedimentoObj.push(pedimentoObj)
            //                                     }
            //                                 }
            //                                 validateToCreateMaster = true
            //                             }
            //                         }
            //                     }
            //                 }
            //             }

            //             log.debug({ title: '🟢 Arreglo de objetos para generar el maestro de pedimentos', details: array_pedimentoObj });

            //             // Si se encontro al menos un articulo que posea articulo numero de pedimento entonces buscara y actualizará
            //             if (array_pedimentoObj.length > 0) {
            //                 var searchResults = searchToHistoryPed(array_pedimentoObj, ubicacionLinea,record_now);
            //             }
            //             //Populate "RECIBIDO POR ADUANA" field with the aduana IO


            //         }
            //         break;
            // }
        } catch (e) {
            log.audit({ title: 'error', details: e });
        }

    }

    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const afterSubmit = (scriptContext) => {
        try {
            var contextType = scriptContext.type;

            switch (contextType) {
                case scriptContext.UserEventType.EDIT:
                    var record_now = scriptContext.newRecord;
                    var recType = record_now.type;

                    var sublista = '';
                    var campo_rate = '';
                    var campo_cantidad = '';
                    if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                        sublista = 'inventory';
                        campo_cantidad = 'adjustqtyby';
                        campo_rate = 'unitcost';
                    }

                    var conteoLine = record_now.getLineCount({ sublistId: sublista });
                    log.audit({ title: 'conteoLine', details: conteoLine })

                    var array_pedimentoObj = [];
                    for (var i = 0; i < conteoLine; i++) {
                        var pedimentoObj = {
                            noSerie: '',
                            pedimento: '',
                            item: '',
                            cantidad: '',
                            costo: '',
                            total: '',
                            tienePedimento: '',
                            ubicacion: ''
                        }


                        pedimentoObj.tienePedimento = record_now.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_contains', line: i }) || '';
                        log.audit({ title: 'pedimentoObj.tienePedimento', details: pedimentoObj.tienePedimento });
                        var tipoItem = record_now.getSublistValue({ sublistId: sublista, fieldId: 'itemtype', line: i }) || '';
                        var tipoQItem = record_now.getSublistValue({ sublistId: sublista, fieldId: 'quantity', line: i }) || '';
                        var ubicacionLinea = record_now.getSublistValue({ sublistId: sublista, fieldId: 'location', line: i }) || '';
                        var listaensa = [];

                        log.audit({ title: 'tipoItem', details: tipoItem });
                        // Validacion si tiene el check habilitado de Pedimento

                        if (pedimentoObj.tienePedimento) {
                            var ItemIdAssembly = record_now.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || '';
                            var nameItem = record_now.getSublistText({ sublistId: sublista, fieldId: 'item', line: i }) || ''

                            log.audit({ title: 'ID Item', details: { ItemIdAssembly, nameItem } });
                            pedimentoObj.item = record_now.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || '';
                            pedimentoObj.pedimento = record_now.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_numero_pedimento', line: i }) || '';
                            pedimentoObj.costo = parseFloat(record_now.getSublistValue({ sublistId: sublista, fieldId: campo_rate, line: i })) || '';
                            pedimentoObj.ubicacion = record_now.getSublistValue({ sublistId: sublista, fieldId: 'location', line: i }) || '';

                            var inventoryDetail = record_now.getSublistSubrecord({ sublistId: sublista, fieldId: 'inventorydetail', line: i });
                            var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: 'inventoryassignment' });

                            var arrInvDetail = []
                            for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
                                log.debug({ title: 'inventoryDetail', details: inventoryDetail });
                                var invDetNum = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: indexInvDet })
                                var invDetQty = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: indexInvDet })
                                arrInvDetail.push({ invDetNum, invDetQty })
                            }
                            log.audit({ title: 'Data to Inventory Detail:', details: arrInvDetail });
                            if (arrInvDetail.length > 0) {
                                arrInvDetail.forEach(invDet => {
                                    var newPedObj = Object.assign({}, pedimentoObj)
                                    newPedObj.noSerie = invDet.invDetNum
                                    newPedObj.cantidad = invDet.invDetQty
                                    if (newPedObj.pedimento) {
                                        newPedObj.total = parseFloat(newPedObj.costo) * parseFloat(newPedObj.cantidad);
                                        array_pedimentoObj.push(newPedObj)
                                    }
                                })
                            } else {
                                pedimentoObj.total = parseFloat(pedimentoObj.costo) * parseFloat(pedimentoObj.cantidad);
                                pedimentoObj.cantidad = parseFloat(record_now.getSublistValue({ sublistId: sublista, fieldId: campo_cantidad, line: i })) || '';
                                if (pedimentoObj.pedimento) {
                                    array_pedimentoObj.push(pedimentoObj)
                                }
                            }
                        }
                    }
                    if (array_pedimentoObj.length > 0) {
                        searchToHistoryPed(array_pedimentoObj, ubicacionLinea, record_now)
                    }
                    break;
                case scriptContext.UserEventType.CREATE:
                    var record_now = scriptContext.newRecord;
                    var recType = record_now.type;

                    var sublista = '';
                    var campo_rate = '';
                    var campo_cantidad = '';

                    var array_pedimentoObj = [];

                    if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                        sublista = 'inventory';
                        campo_cantidad = 'adjustqtyby';
                        campo_rate = 'unitcost';

                        //Ver si este receipt proviende de un inboundshipment
                        var fieldTypeMovement = record_now.getValue('custbody_efx_ped_type_movement');
                        var fieldNoPedimento = record_now.getValue('custbody_efx_ped_no_pedimento_oc');

                        log.debug({ title: 'fieldTypeMovement', details: fieldTypeMovement });
                        log.debug({ title: 'fieldNoPedimento', details: fieldNoPedimento });

                        var noLinRecNvo = record_now.getLineCount({ sublistId: sublista });
                        noPedimento = record_now.getValue({ fieldId: 'custbody_efx_ped_no_pedimento_oc' });
                        log.debug({title: 'noPedimento', details: noPedimento});
                        switch (fieldTypeMovement) {
                            case '1':
                                //Contar cuantas lineas traeria la sublista de este recibo

                                log.audit({ title: 'SE VA A CREAR UN INVENTORY ADJUSTMENT con este numero de lineas: ' + noLinRecNvo, details: '' });

                                let objAuxToGetLines = getValuesToLine(record_now, noLinRecNvo)
                                array_pedimentoObj = objAuxToGetLines.array_pedimentoObj
                                validateToCreateMaster = objAuxToGetLines.validateToCreateMaster
                                break;
                            case '2':
                                break;
                        }
                        log.debug({ title: '🟢 Arreglo de objetos para generar el maestro de pedimentos', details: array_pedimentoObj });

                        // Si se encontro al menos un articulo que posea articulo numero de pedimento entonces buscara y actualizará
                        if (array_pedimentoObj.length > 0 && false) {
                            var searchResults = searchToHistoryPed(array_pedimentoObj, ubicacionLinea, record_now);

                            // Update the ItemReceipt with No. Pedimento
                            var itemReceipt = record.load({ type: record.Type.ITEM_RECEIPT, id: record_now.id, isDynamic: true })

                            var numLines = itemReceipt.getLineCount({ sublistId: 'item' });
                            for (var i = 0; i < numLines; i++) {
                                let validationToContains = itemReceipt.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_contains', line: i }) || '';
                                if (validationToContains === true) {
                                    itemReceipt.selectLine({ sublistId: sublista, line: i });
                                    itemReceipt.setCurrentSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_numero_pedimento', value: noPedimento, ignoreFieldChange: true })
                                    itemReceipt.commitLine({ sublistId: sublista })
                                }
                            }
                            itemReceipt.save({ enableSourcing: true, ignoreMandatoryFields: true })
                        }
                    }
                    break;
            }
        } catch (e) {
            log.error({ title: 'Error afterSubmit:', details: e });
        }
    }

    function getValuesToLine(record_now, noLinRecNvo) {
        try {
            var validateToCreateMaster = false
            var array_pedimentoObj =[];
            //Por ej, considerando 3 lineas, habria que iterar cada una, marcar la casilla de pedimento y agregar el numero de pedimento
            //Recorrer los articulos del receipt y ponerles el pedimento
            for (i = 0; i < noLinRecNvo; i++) {
                var pedimentoObj = {
                    noSerie: '',
                    pedimento: '',
                    item: '',
                    cantidad: '',
                    costo: '',
                    total: '',
                    tienePedimento: '',
                    ubicacion: ''
                }

                pedimentoObj.tienePedimento = record_now.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_contains', line: i }) || '';
                var tipoItem = record_now.getSublistValue({ sublistId: sublista, fieldId: 'itemtype', line: i }) || '';
                var itemId = record_now.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                var needPedim = search.lookupFields({ type: search.Type.ITEM, id: itemId, columns: ['custitem_efx_ped_contains'] });
                log.debug({ title: 'needPedim', details: needPedim });
                if (needPedim.custitem_efx_ped_contains) {

                    record_now.setSublistValue({ sublistId: 'item', fieldId: 'custcol_efx_ped_numero_pedimento', line: i, value: noPedimento });
                    record_now.setSublistValue({ sublistId: 'item', fieldId: 'custcol_efx_ped_contains', line: i, value: true });

                    pedimentoObj.item = record_now.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || '';
                    pedimentoObj.pedimento = record_now.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_numero_pedimento', line: i }) || '';
                    pedimentoObj.costo = parseFloat(record_now.getSublistValue({ sublistId: sublista, fieldId: campo_rate, line: i })) || '';
                    pedimentoObj.ubicacion = record_now.getSublistValue({ sublistId: sublista, fieldId: 'location', line: i }) || '';

                    var inventoryDetail = record_now.getSublistSubrecord({ sublistId: sublista, fieldId: 'inventorydetail', line: i });
                    var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: 'inventoryassignment' });

                    var arrInvDetail = []
                    for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
                        log.debug({ title: 'inventoryDetail', details: inventoryDetail });
                        var invDetNum = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: indexInvDet })
                        var invDetQty = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: indexInvDet })
                        arrInvDetail.push({ invDetNum, invDetQty })
                    }
                    log.audit({ title: 'Data to Inventory Detail:', details: arrInvDetail });
                    if (arrInvDetail.length > 0) {
                        arrInvDetail.forEach(invDet => {
                            var newPedObj = Object.assign({}, pedimentoObj)
                            newPedObj.noSerie = invDet.invDetNum
                            newPedObj.cantidad = invDet.invDetQty
                            if (newPedObj.pedimento) {
                                newPedObj.total = parseFloat(newPedObj.costo) * parseFloat(newPedObj.cantidad);
                                array_pedimentoObj.push(newPedObj)
                            }
                        })
                    } else {
                        pedimentoObj.total = parseFloat(pedimentoObj.costo) * parseFloat(pedimentoObj.cantidad);
                        pedimentoObj.cantidad = parseFloat(record_now.getSublistValue({ sublistId: sublista, fieldId: campo_cantidad, line: i })) || '';
                        if (pedimentoObj.pedimento) {
                            array_pedimentoObj.push(pedimentoObj)
                        }
                    }
                    validateToCreateMaster = true
                }
            }
            return [array_pedimentoObj, validateToCreateMaster]
        } catch (e) {
            log.error({ title: 'Error getvaluesToLine:', details: e });
            return { array_pedimentoObj: [], validateToCreateMaster: false }
        }
    }
    function searchToHistoryPed(array_pedimentoObj, ubicacionLinea, record_now) {
        try {
            var filtros_pedimento = new Array();
            var filtros_pedimento_extra = new Array();

            filtros_pedimento.push(['isinactive', search.Operator.IS, 'F']);
            filtros_pedimento.push('AND');
            filtros_pedimento.push(['custrecord_efx_ped_related_tran', search.Operator.IS, record_now.id]);

            for (var i = 0; i < array_pedimentoObj.length; i++) {
                var filtro = [
                    ['custrecord_efx_ped_numpedimento', search.Operator.IS, array_pedimentoObj[i].pedimento],
                    'AND',
                    ['custrecord_efx_ped_h_item', search.Operator.ANYOF, array_pedimentoObj[i].item],
                    'AND',
                    ['custrecord_efx_ped_h_location', search.Operator.ANYOF, array_pedimentoObj[i].ubicacion]
                ];
                if (array_pedimentoObj[i].noSerie) {
                    filtro.push('AND', ['custrecord_efx_ped_historial_serial_lote', search.Operator.IS, array_pedimentoObj[i].noSerie])
                }
                filtros_pedimento_extra.push(filtro);
                var conteo = i + 1;
                if (conteo < array_pedimentoObj.length) {
                    filtros_pedimento_extra.push('OR');
                }
            }
            if (filtros_pedimento_extra.length > 0) {
                filtros_pedimento.push('AND');
                filtros_pedimento.push(filtros_pedimento_extra);
            }

            log.audit({ title: 'filtros_pedimento', details: filtros_pedimento });
            var buscaPed = search.create({
                type: 'customrecord_efx_ped_record_history',
                filters: [
                    ['isinactive', search.Operator.IS, 'F']
                    , 'AND',
                    ['custrecord_efx_ped_related_tran', search.Operator.IS, record_now.id]
                    , 'AND',
                    filtros_pedimento
                ],
                columns: [
                    search.createColumn({ name: 'created', sort: search.Sort.DESC }),
                    search.createColumn({ name: 'custrecord_efx_ped_related_tran' }),
                    search.createColumn({ name: 'custrecord_efx_ped_h_item' }),
                    search.createColumn({ name: 'custrecord_efx_ped_historial_serial_lote' }),
                    search.createColumn({ name: 'custrecord_efx_ped_h_quantity' }),
                    search.createColumn({ name: 'custrecord_efx_ped_numpedimento' }),
                    search.createColumn({ name: 'custrecord_efx_ped_h_pedimento' }),
                    search.createColumn({ name: 'custrecord_efx_ped_h_location' }),
                    search.createColumn({ name: 'internalid' }),
                ],
            });
            var ejecutar_pedimento = buscaPed.run();
            log.audit({ title: 'ejecutar_pedimento', details: ejecutar_pedimento });
            var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);

            log.audit({ title: 'No. resultados del historico: ', details: resultado_pedimento.length });
            log.audit({ title: 'No. de lineas a comparar: ', details: array_pedimentoObj.length });
            log.audit({ title: 'Arreglo de objetos: ', details: array_pedimentoObj });

            // Se recorren los resultados encontrados y se actualizan en caso de haber coincidencias con el numero de pedimento
            for (var p = 0; p < resultado_pedimento.length; p++) {
                var transaccion_busca = resultado_pedimento[p].getValue({ name: 'custrecord_efx_ped_related_tran' }) || '';
                var item_busca = resultado_pedimento[p].getValue({ name: 'custrecord_efx_ped_h_item' }) || '';
                var serieLoteBuscar = resultado_pedimento[p].getValue({ name: 'custrecord_efx_ped_historial_serial_lote' }) || '';
                var cantidad_busca = parseFloat(resultado_pedimento[p].getValue({ name: 'custrecord_efx_ped_h_quantity' })) || '';
                var pedimento_busca = resultado_pedimento[p].getValue({ name: 'custrecord_efx_ped_numpedimento' }) || '';
                var pedimentoid_busca = resultado_pedimento[p].getValue({ name: 'custrecord_efx_ped_h_pedimento' }) || '';
                var ubicacion_busca = resultado_pedimento[p].getValue({ name: 'custrecord_efx_ped_h_location' }) || '';
                var historicoid_busca = resultado_pedimento[p].getValue({ name: 'internalid' }) || '';
                var elimina_existe = '';


                log.debug({ title: 'Valor a buscar:', details: { item_busca, serieLoteBuscar, cantidad_busca, pedimento_busca, pedimentoid_busca, ubicacion_busca } });
                let lineToFind = array_pedimentoObj.find(pedLine => pedimento_busca === pedLine.pedimento && item_busca === pedLine.item && ubicacion_busca === pedLine.ubicacion && serieLoteBuscar === pedLine.noSerie) || null;
                log.debug({ title: 'Valor encontrado', details: (lineToFind ? { detalle: 'Se encontro un objeto y es: ', lineToFind } : 'No se encontro algun historico ' + lineToFind) });

                if (lineToFind) {

                    if (cantidad_busca < lineToFind.cantidad && cantidad_busca !== lineToFind.cantidad) {
                        //suma
                        var cantidad_nueva = lineToFind.cantidad - cantidad_busca;
                        var total_costo_ped = parseFloat(cantidad_nueva) * parseFloat(lineToFind.costo);
                        log.audit({ title: 'cantidad_nueva_suma', details: cantidad_nueva });
                        var old_value = actualizaPedimento(cantidad_nueva, total_costo_ped, pedimentoid_busca, 'T');
                        log.audit({ title: 'transaccion_busca', details: transaccion_busca });
                        log.audit({ title: 'lineToFind927', details: lineToFind });
                        log.audit({ title: 'pedimentoid_busca', details: pedimentoid_busca });
                        log.audit({ title: 'old_value', details: old_value });
                        historicoPedimento(transaccion_busca, lineToFind, pedimentoid_busca, old_value, cantidad_nueva);
                    }
                    if (cantidad_busca > lineToFind.cantidad && cantidad_busca !== lineToFind.cantidad) {
                        //resta
                        var cantidad_nueva = cantidad_busca - lineToFind.cantidad;
                        cantidad_nueva = cantidad_nueva * (-1);
                        log.audit({ title: 'cantidad_nueva_resta', details: cantidad_nueva });
                        var total_costo_ped = parseFloat(cantidad_nueva) * parseFloat(lineToFind.costo);
                        log.audit({ title: 'total_costo_ped_resta', details: total_costo_ped });
                        var old_value = actualizaPedimento(cantidad_nueva, total_costo_ped, pedimentoid_busca, 'T');
                        log.audit({ title: 'transaccion_busca', details: transaccion_busca });
                        log.audit({ title: 'lineToFind943', details: lineToFind });
                        log.audit({ title: 'pedimentoid_busca', details: pedimentoid_busca });
                        log.audit({ title: 'old_value', details: old_value });
                        historicoPedimento(transaccion_busca, lineToFind, pedimentoid_busca, old_value, cantidad_nueva);
                    }
                    array_pedimentoObj = array_pedimentoObj.filter(pedLine => pedimento_busca !== pedLine.pedimento && item_busca !== pedLine.item && ubicacion_busca !== pedLine.ubicacion && serieLoteBuscar !== pedLine.noSerie) || null;
                }
            }
            log.audit({ title: 'Pedimentos por crear', details: array_pedimentoObj });

            for (var tc = 0; tc < array_pedimentoObj.length; tc++) {
                var pedimento_id = generateMasterToPedimento(record_now, array_pedimentoObj[tc], ubicacionLinea);
                generateHistoricToPedimento(record_now, array_pedimentoObj[tc], pedimento_id);
            }
        } catch (e) {
            log.error({ title: 'Error searchToHistoryPed:', details: e });
        }
    }
    function generateMasterToPedimento(record_now, objToCreate, ubicacionLinea) {
        try {
            var ped_master_record = record.create({ type: 'customrecord_efx_ped_master_record', });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_number', value: objToCreate.pedimento });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_date', value: record_now.getValue({ fieldId: 'trandate' }) });
            ped_master_record.setValue({ fieldId: 'custrecord_exf_ped_location', value: ubicacionLinea });
            ped_master_record.setValue({ fieldId: 'custrecord_exf_ped_item', value: objToCreate.item });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_serial_lote', value: objToCreate.noSerie });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_available', value: objToCreate.cantidad });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_exchange', value: record_now.getValue({ fieldId: 'exchangerate' }) });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_adnumber', value: 'numeroAduana' });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_adname', value: 'NombreAduana' });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_price', value: objToCreate.costo });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_eta', value: record_now.getValue({ fieldId: 'trandate' }) });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_etd', value: record_now.getValue({ fieldId: 'trandate' }) });
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_total', value: objToCreate.total });
            var pedimento_id = ped_master_record.save();
            log.audit({ title: 'Maestro de pedimento generado', details: pedimento_id });
            return pedimento_id
        } catch (e) {
            log.error({ title: 'Error generateMasterToPedimento:', details: e });
        }
    }
    function generateHistoricToPedimento(record_now, objToCreate, pedimento_id) {
        try {
            var ped_history = record.create({ type: 'customrecord_efx_ped_record_history' });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_related_tran', value: record_now.id });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_item', value: objToCreate.item });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_historial_serial_lote', value: objToCreate.noSerie });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_quantity', value: objToCreate.cantidad });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_location', value: objToCreate.ubicacion });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_oldvalue', value: 0 });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_newvalue', value: objToCreate.cantidad });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_pedimento', value: pedimento_id });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_numpedimento', value: objToCreate.pedimento });
            let Histpedimento_id = ped_history.save();
            log.audit({ title: 'Historico de pedimento generado', details: Histpedimento_id });

        } catch (e) {
            log.error({ title: 'Error generaMasterToPedimento:', details: e });
        }
    }
    const actualizaPedimento = (cantidad_ped, total_ped, idPedimentos, edita) => {
        var ped_master_record = record.load({ type: 'customrecord_efx_ped_master_record', id: idPedimentos });
        if (edita == 'T') {

            var cantidad_e_ped = parseFloat(ped_master_record.getValue({ fieldId: 'custrecord_efx_ped_available', }));
            cantidad_ped = cantidad_e_ped + cantidad_ped;

            var total_e_ped = ped_master_record.getValue({ fieldId: 'custrecord_efx_ped_total' });

            total_ped = parseFloat(total_e_ped) + parseFloat(total_ped);

        }
        log.audit({ title: 'cantidad_ped', details: cantidad_ped });
        if (cantidad_ped >= 0) {
            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_available', value: cantidad_ped });

            ped_master_record.setValue({ fieldId: 'custrecord_efx_ped_total', value: total_ped });
            var id_masrte = ped_master_record.save();
        }

        log.audit({ title: 'actualiza_master', details: id_masrte });
        if (edita == 'T') {
            return cantidad_e_ped;
        }

    }
    const historicoPedimento = (id_tran, array_pedimentos, idPedimentos, oldValue, cantidad_nueva) => {

        log.audit({ title: 'array_pedimentos.cantidad', details: array_pedimentos.cantidad });
        log.audit({ title: 'cantidad_nueva', details: cantidad_nueva });


        var nuevo_valor = parseFloat(oldValue) + parseFloat(cantidad_nueva);
        if (nuevo_valor >= 0 && cantidad_nueva) {
            var ped_history = record.create({ type: 'customrecord_efx_ped_record_history' });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_related_tran', value: id_tran });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_item', value: array_pedimentos.item });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_serial_lote', value: array_pedimentos.noSerie });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_quantity', value: array_pedimentos.cantidad });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_oldvalue', value: oldValue });

            if (cantidad_nueva) {
                ped_history.setValue({ fieldId: 'custrecord_efx_ped_newvalue', value: parseFloat(oldValue) + parseFloat(cantidad_nueva) });
            } else {
                ped_history.setValue({ fieldId: 'custrecord_efx_ped_newvalue', value: parseFloat(array_pedimentos.cantidad) + parseFloat(oldValue) });
            }

            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_pedimento', value: idPedimentos });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_numpedimento', value: array_pedimentos.pedimento });
            var crea_h = ped_history.save();
            log.audit({ title: 'crea_historico', details: crea_h });
        }

        if (!cantidad_nueva) {
            var ped_history = record.create({ type: 'customrecord_efx_ped_record_history' });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_related_tran', value: id_tran });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_item', value: array_pedimentos.item });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_serial_lote', value: array_pedimentos.noSerie });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_quantity', value: array_pedimentos.cantidad });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_oldvalue', value: oldValue });

            if (cantidad_nueva) {
                ped_history.setValue({ fieldId: 'custrecord_efx_ped_newvalue', value: parseFloat(oldValue) + parseFloat(cantidad_nueva) });
            } else {
                ped_history.setValue({ fieldId: 'custrecord_efx_ped_newvalue', value: parseFloat(array_pedimentos.cantidad) + parseFloat(oldValue) });
            }

            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_pedimento', value: idPedimentos });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_numpedimento', value: array_pedimentos.pedimento });
            var crea_h = ped_history.save();
            log.audit({ title: 'crea_historico', details: crea_h });
        }


    }
    function validatePedimento(inbShip) {
        var dataReturn = { succes: false, data: {} }
        try {
            var dataPedimento = search.lookupFields({
                type: search.Type.INBOUND_SHIPMENT,
                id: inbShip,
                columns: ['custrecord_efx_ped_inb_pedimento']
            });
            log.debug({ title: 'dataPedimento', details: dataPedimento });
        } catch (error) {
            log.error({ title: 'validatePedimento', details: error });
        }
        return dataReturn;
    }
    const buscaPedimentos = (pedimentos_linea) => {

        var filtros_pedimento = new Array();
        for (var i = 0; i < pedimentos_linea.length; i++) {
            var filtro = [['custrecord_efx_ped_number', search.Operator.IS, pedimentos_linea[i].pedimento], 'AND', ['custrecord_exf_ped_item', search.Operator.ANYOF, pedimentos_linea[i].item]];
            filtros_pedimento.push(filtro);
            var conteo = i + 1;
            if (conteo < pedimentos_linea.length) {
                filtros_pedimento.push('OR');
            }
        }
        log.audit({ title: 'filtros_pedimento', details: filtros_pedimento });

        var buscaPed = search.create({
            type: 'customrecord_efx_ped_master_record',
            filters: [
                ['isinactive', search.Operator.IS, 'F']
                , 'AND',
                filtros_pedimento
            ],
            columns: [
                search.createColumn({ name: 'custrecord_efx_ped_number' }),
                search.createColumn({ name: 'custrecord_exf_ped_item' }),
                search.createColumn({ name: 'custrecord_efx_ped_available' }),
                search.createColumn({ name: 'custrecord_efx_ped_total' }),
                search.createColumn({ name: 'internalid' }),
            ]
        });

        var ejecutar_pedimento = buscaPed.run();
        var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);

        log.audit({ title: 'resultado_pedimento', details: resultado_pedimento });

        var arregloBusqueda = new Array();
        for (var x = 0; x < resultado_pedimento.length; x++) {
            var searchPedimentos = {
                numeroPedimento: '',
                articuloPedimento: '',
                cantidadDisponible: '',
                totalPedimento: '',
                id: ''
            }
            searchPedimentos.numeroPedimento = resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_number' }) || '';
            searchPedimentos.articuloPedimento = resultado_pedimento[x].getValue({ name: 'custrecord_exf_ped_item' }) || '';
            searchPedimentos.cantidadDisponible = resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_available' }) || '';
            searchPedimentos.totalPedimento = resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_total' }) || '';
            searchPedimentos.id = resultado_pedimento[x].getValue({ name: 'internalid' }) || '';
            arregloBusqueda.push(searchPedimentos);
        }

        return arregloBusqueda;
    }
    const consultaPedimentos = (cantidad_ped, idPedimentos) => {

        log.audit({ title: 'cantidad_ped', details: cantidad_ped });
        log.audit({ title: 'idPedimentos', details: idPedimentos });
        var ped_master_record = record.load({
            type: 'customrecord_efx_ped_master_record',
            id: idPedimentos
        });

        var cantidad_e_ped = parseFloat(ped_master_record.getValue({
            fieldId: 'custrecord_efx_ped_available',
        }));
        cantidad_ped = cantidad_e_ped + cantidad_ped;
        log.audit({ title: 'cantidad_ped-bf', details: cantidad_ped });
        if (cantidad_ped < 0) {
            throw 'La cantidad ingresada es mayor a la cantidad disponible en stock, favor de verificar su disponibilidad de stock';
        }


    }
    return { beforeLoad, beforeSubmit, afterSubmit }
});
