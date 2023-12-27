/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @file Script para manejar las salidas de inventario de pedimentos (En inventory adjustment solo funciona cuando
 * el valor es negativo)
 */
define(['N/record', 'N/search'],
    /**
     * @param{record} record
     * @param{search} search
     */
    (record, search) => {
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

                var record_now = scriptContext.newRecord;
                var recType = record_now.type;

                switch (scriptContext.type) {
                    case scriptContext.UserEventType.EDIT:
                        // mag
                        // falta que en Sales Order al momento de editar el inventory detail, se traiga el numero de pedimento correspondiente a la serie y actualice o deje pasar
                        break;
                    case scriptContext.UserEventType.CREATE:
                        var sublista = '';
                        var campo_rate = '';
                        var campo_cantidad = '';

                        if (recType == record.Type.ITEM_FULFILLMENT || recType == record.Type.VENDOR_CREDIT || recType == record.Type.CASH_SALE) {
                            sublista = 'item';
                            campo_cantidad = 'quantity';
                            campo_rate = 'rate';

                            var record_obj = record.load({ type: recType, id: record_now.id });
                        }

                        if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                            sublista = 'inventory';
                            campo_cantidad = 'adjustqtyby';
                            campo_rate = 'unitcost';

                            var record_obj = record.load({ type: recType, id: record_now.id });
                        }
                        var conteoLine = record_obj.getLineCount({ sublistId: sublista });
                        log.audit({ title: 'conteoLine', details: conteoLine });

                        var listaensa = [];
                        var arrIdLotSerie = []
                        var arrayPedimento = new Array();
                        for (var i = 0; i < conteoLine; i++) {
                            var pedimentoObj = {
                                pedimento: '',
                                cantidad: '',
                                item: '',
                                linea: '',
                                ubicacion: '',
                                rate: ''
                            }
                            var tipoItem = record_obj.getSublistValue({ sublistId: sublista, fieldId: 'itemtype', line: i }) || '';
                            var ItemIdAssembly = record_obj.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || '';
                            log.audit({ title: 'ItemIdAssembly', details: ItemIdAssembly });
                            log.audit({ title: 'tipoItem', details: tipoItem });

                            var contiene_pedimento = record_obj.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_contains', line: i }) || false;
                            if (tipoItem === 'InvtPart' && contiene_pedimento) {
                                log.debug({ title: 'Obtiene todos los articulo cuyo tipo es de inventario', details: '🟢' });
                                pedimentoObj.item = record_obj.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || 0;
                                pedimentoObj.rate = record_obj.getSublistValue({ sublistId: sublista, fieldId: campo_rate, line: i }) || 0;
                                pedimentoObj.ubicacion = record_obj.getSublistValue({ sublistId: sublista, fieldId: 'location', line: i }) || 0;

                                var inventoryDetail = record_now.getSublistSubrecord({ sublistId: sublista, fieldId: 'inventorydetail', line: i });
                                var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: 'inventoryassignment' });

                                var arrInvDetail = []
                                for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
                                    log.debug({ title: 'inventoryDetail', details: inventoryDetail });
                                    var invDetNumId = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorydetail', line: indexInvDet })
                                    var serialLotId = parseInt(inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: indexInvDet }))
                                    var invDetQty = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: indexInvDet })

                                    arrInvDetail.push({ invDetNumId, serialLotId, invDetQty })
                                }
                                log.audit({ title: 'Data to Inventory Detail:', details: arrInvDetail });
                                if (arrInvDetail.length > 0) {
                                    arrInvDetail.forEach(invDet => {
                                        var newPedObj = Object.assign({}, pedimentoObj)
                                        newPedObj.serieLote = invDet.serialLotId
                                        newPedObj.cantidad = invDet.invDetQty
                                        newPedObj.total = parseFloat(newPedObj.rate) * parseFloat(newPedObj.cantidad);
                                        arrayPedimento.push(newPedObj)
                                    })

                                    arrIdLotSerie = arrIdLotSerie.concat(arrInvDetail)
                                } else {
                                    pedimentoObj.total = parseFloat(pedimentoObj.rate) * parseFloat(pedimentoObj.cantidad);
                                    pedimentoObj.cantidad = parseFloat(record_now.getSublistValue({ sublistId: sublista, fieldId: campo_cantidad, line: i })) || '';

                                    arrayPedimento.push(pedimentoObj)

                                }

                                // if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                //     var ubicacion_pedimento = record_obj.getSublistValue({ sublistId: sublista, fieldId: 'location', line: i }) || 0;
                                //     if (contiene_pedimento) {
                                //         if (cantidad_pedimento < 0) {
                                //             objPedimento.pedimento = numero_p_linea;
                                //             objPedimento.cantidad = cantidad_pedimento;
                                //             objPedimento.item = item_pedimento;
                                //             objPedimento.ubicacion = ubicacion_pedimento;
                                //             objPedimento.linea = i;
                                //             objPedimento.rate = rate_pedimento;
                                //             arrayPedimento.push(objPedimento);
                                //         }
                                //     }
                                // } else {

                                //     log.audit({ title: 'contiene_pedimento', details: contiene_pedimento });
                                //     if (contiene_pedimento) {
                                //         objPedimento.pedimento = numero_p_linea;
                                //         objPedimento.cantidad = cantidad_pedimento;
                                //         objPedimento.item = item_pedimento;
                                //         objPedimento.linea = i;
                                //         objPedimento.rate = rate_pedimento;
                                //         arrayPedimento.push(objPedimento);
                                //     }

                                // }
                            }

                        }
                        log.debug({ title: 'arrayPedimento', details: arrayPedimento });

                        if (arrayPedimento.length > 0) {
                            var lotesSeries = (arrIdLotSerie.length < 0 ? [] : getIdLotNumber(arrIdLotSerie));

                            if (lotesSeries.length > 0) {
                                arrayPedimento.map(lineaPib => {
                                    log.debug({ title: 'lineaPib', details: lineaPib });
                                    let lineaEncontrada = lotesSeries.find(lotSer => lotSer.lotId === lineaPib.serieLote) || null;
                                    log.debug({ title: 'lineaEncontrada', details: lineaEncontrada });
                                    if (lineaEncontrada) {
                                        lineaPib.serieLote = lineaEncontrada.inventorynumber
                                    }
                                    return lineaPib;
                                })
                                log.debug({ title: '🟢Lineas modificadas:', details: arrayPedimento });
                            }
                            var masterPedSearch = searchMasterPedimento(arrayPedimento)
                            var contValidador = 0
                            arrayPedimento.map(lineToPed => {

                                // log.debug({ title: 'Data to compare', details: { lineToPed, masterPedSearch } });
                                var pedfinder = null;
                                pedfinder = (lineToPed.serieLote ? masterPedSearch.find(masterPib => masterPib.item === lineToPed.item && lineToPed.serieLote === masterPib.serieLoteMP && masterPib.qtyAvailable >= lineToPed.cantidad) : masterPedSearch.find(masterPib => masterPib.item === lineToPed.item && masterPib.qtyAvailable >= lineToPed.cantidad))
                                log.debug({ title: 'pedfinder', details: pedfinder });
                                if (pedfinder) {
                                    contValidador++;
                                    lineToPed.qtyAvailable = pedfinder.qtyAvailable
                                    lineToPed.internalidMP = pedfinder.internalid
                                    lineToPed.pedimento = pedfinder.noPedimento
                                }
                            })
                            if (contValidador === arrayPedimento.length) {
                                log.debug({ title: 'Lineas a crear historial y consumir pedimento:', details: arrayPedimento });
                                // // Recorrido para actualizar los registros
                                arrayPedimento.forEach((lineConsumidora) => {
                                    var qtyAux = actualizaPedimento(lineConsumidora.internalidMP, lineConsumidora.cantidad, lineConsumidora.rate);
                                    log.debug({ title: 'qtyAux', details: qtyAux });
                                    if (qtyAux.qtyOld >= 0 && qtyAux.qtyNew >= 0) {
                                        historicoPedimento(record_now.id, lineConsumidora, qtyAux.qtyOld, qtyAux.qtyNew)
                                    }
                                })

                                if (recType === record.Type.ITEM_FULFILLMENT) {
                                    var itemFulfillment = record.load({ type: record.Type.ITEM_FULFILLMENT, id: record_now.id, isDynamic: true })
                                    var numLines = itemFulfillment.getLineCount({ sublistId: 'item' });
                                    for (var i = 0; i < numLines; i++) {
                                        let validationToContains = itemFulfillment.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_contains', line: i }) || '';
                                        let item = itemFulfillment.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || '';
                                        log.debug({ title: 'item', details: item });
                                        var noPedimentoString = '';
                                        if (validationToContains === true) {
                                            var itemLine = arrayPedimento.filter(function (itemLinePib) { return itemLinePib.item == item }) || [];
                                            log.debug({ title: 'arrayPedimento', details: arrayPedimento });
                                            log.debug({ title: 'itemLine', details: itemLine });
                                            if (itemLine.length > 0) {
                                                if (itemLine[0].serieLote) {
                                                    itemLine.forEach((itemPIB, index_item) => {
                                                        if (index_item === (itemPIB.length - 1)) {
                                                            noPedimentoString += (!noPedimentoString.includes(itemPIB.pedimento) ? itemPIB.pedimento : '')
                                                        } else {
                                                            noPedimentoString += (!noPedimentoString.includes(itemPIB.pedimento) ? itemPIB.pedimento + ',' : '')
                                                        }
                                                    })
                                                } else {
                                                    noPedimentoString = itemLine[0].pedimento
                                                }
                                            }
                                            itemFulfillment.selectLine({ sublistId: sublista, line: i });
                                            itemFulfillment.setCurrentSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_numero_pedimento', value: noPedimentoString, ignoreFieldChange: true })
                                            itemFulfillment.commitLine({ sublistId: sublista })
                                        }
                                    }
                                    itemFulfillment.save({ enableSourcing: true, ignoreMandatoryFields: true })
                                    if (record_now.getValue({ fieldId: 'createdfrom' })) {
                                        var invoice = record.load({ type: record.Type.SALES_ORDER, id: record_now.getValue({ fieldId: 'createdfrom' }), isDynamic: true })
                                        var numLines = invoice.getLineCount({ sublistId: 'item' });
                                        for (var i = 0; i < numLines; i++) {
                                            let validationToContains = invoice.getSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_contains', line: i }) || '';
                                            let item = invoice.getSublistValue({ sublistId: sublista, fieldId: 'item', line: i }) || '';
                                            var noPedimentoString = '';
                                            if (validationToContains === true) {
                                                var itemLine = arrayPedimento.filter(function (itemLinePib) { return itemLinePib.item == item }) || [];
                                                log.debug({ title: 'itemLine', details: itemLine });
                                                log.debug({ title: 'arrayPedimento', details: arrayPedimento });
                                                if (itemLine.length > 0) {
                                                    if (itemLine[0].serieLote) {
                                                        itemLine.forEach((itemPIB, index_item) => {
                                                            if (index_item === (itemPIB.length - 1)) {
                                                                noPedimentoString += (!noPedimentoString.includes(itemPIB.pedimento) ? itemPIB.pedimento : '')
                                                            } else {
                                                                noPedimentoString += (!noPedimentoString.includes(itemPIB.pedimento) ? itemPIB.pedimento + ',' : '')
                                                            }
                                                        })
                                                    } else {
                                                        noPedimentoString = itemLine[0].pedimento
                                                    }
                                                }
                                                invoice.selectLine({ sublistId: sublista, line: i });
                                                invoice.setCurrentSublistValue({ sublistId: sublista, fieldId: 'custcol_efx_ped_numero_pedimento', value: noPedimentoString, ignoreFieldChange: true })
                                                invoice.commitLine({ sublistId: sublista })
                                            }
                                        }
                                        invoice.save({ enableSourcing: true, ignoreMandatoryFields: true })
                                    }
                                }
                            }
                        }
                        break;
                }


            } catch (error_consumir) {
                log.audit({ title: 'error_consumir', details: error_consumir });
            }
        }

        function searchMasterPedimento(arrLines) {
            try {
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
                log.debug({ title: 'filtroHistorico', details: filtroHistorico });
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
                    var internalid = resultado_pedimento[x].getValue({ name: 'internalid' }) || 'NA';
                    var itemMaster = resultado_pedimento[x].getValue({ name: 'custrecord_exf_ped_item' }) || 'NA';
                    var noPedMaster = resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_number' }) || 'NA';
                    var serieLoteMP = resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_serial_lote' }) || '';
                    var cantidad_av = parseFloat(resultado_pedimento[x].getValue({ name: 'custrecord_efx_ped_available' })) || 0;
                    log.debug({ title: 'Data to master ped', details: { itemMaster, noPedMaster, serieLoteMP, cantidad_av } });
                    if (itemMaster !== 'NA' && noPedMaster !== 'NA' && cantidad_av > 0) {
                        masterPed.push({
                            internalid: internalid,
                            item: itemMaster,
                            qtyAvailable: cantidad_av,
                            noPedimento: noPedMaster,
                            serieLoteMP: serieLoteMP
                        })
                        masterItems.push(itemMaster);
                    }
                    stok_total = stok_total + cantidad_av;
                }

                log.debug({ title: 'masterItems', details: masterItems });
                log.debug({ title: 'Master Ped Available:', details: masterPed });
                return masterPed;
            } catch (e) {
                log.error({ title: 'Error searchMasterPedimento:', details: e });
                return [];
            }
        }
        function getIdLotNumber(arrIdLotSerie) {
            try {
                var filtros = []
                arrIdLotSerie.forEach((lotSerie, index) => {
                    if (index === (arrIdLotSerie.length - 1)) {
                        filtros.push(["inventorynumber.internalid", "anyof", lotSerie.serialLotId])
                        // filtros.push(["inventorynumber.internalid", "anyof", lotSerie.serialLotId], "AND", ["internalid", "anyof", lotSerie.invDetNumId])
                    } else {
                        filtros.push(["inventorynumber.internalid", "anyof", lotSerie.serialLotId], 'OR')
                    }
                })
                log.debug({ title: 'arrIdLotSerie', details: arrIdLotSerie });
                log.debug({ title: 'filtros', details: filtros });
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

                log.debug({ title: 'Numero de resultados', details: searchResultCount });
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
                log.debug({ title: 'Result LOT', details: results });
                return results;
            } catch (e) {
                log.error({ title: 'Error getIdLotNumber:', details: e });
            }
        }
        function actualizaPedimento(id_pedimento, cantidad_nueva, precio_master) {
            log.audit({ title: 'id_pedimento', details: id_pedimento });
            log.audit({ title: 'cantidad_nueva', details: cantidad_nueva });
            log.audit({ title: 'precio_master', details: precio_master });
            var master_obj = record.load({ type: 'customrecord_efx_ped_master_record', id: id_pedimento });
            var qtyAvailable = parseFloat(master_obj.getValue({ fieldId: 'custrecord_efx_ped_available' })) || 0;
            var qtyOld = parseFloat(master_obj.getValue({ fieldId: 'custrecord_efx_ped_available' })) || 0;
            qtyAvailable = qtyAvailable - cantidad_nueva;
            if (qtyAvailable >= 0) {
                var nuevo_total = 0;
                if (qtyAvailable == 0) {
                    nuevo_total = 0;
                } else {
                    nuevo_total = precio_master * qtyAvailable;
                }
                master_obj.setValue({ fieldId: 'custrecord_efx_ped_available', value: qtyAvailable });
                master_obj.setValue({ fieldId: 'custrecord_efx_ped_total', value: nuevo_total });
                master_obj.save();
                return { qtyOld: qtyOld, qtyNew: qtyAvailable }
            } else {
                return { qtyOld: -1, qtyNew: -1 };
            }
        }

        const historicoPedimento = (id_tran, array_pedimentos, oldValue, cantidad_nueva) => {
            var ped_history = record.create({ type: 'customrecord_efx_ped_record_history' });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_related_tran', value: id_tran });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_item', value: array_pedimentos.item });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_quantity', value: array_pedimentos.cantidad });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_oldvalue', value: oldValue });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_historial_serial_lote', value: array_pedimentos.serieLote || '' });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_location', value: array_pedimentos.ubicacion });

            if (cantidad_nueva) {
                log.audit({ title: 'oldValue', details: oldValue });
                log.audit({ title: 'cantidad_nueva', details: cantidad_nueva });

                ped_history.setValue({ fieldId: 'custrecord_efx_ped_newvalue', value: parseFloat(cantidad_nueva) });
            } else {
                log.audit({ title: 'array_pedimentos.cantidad', details: array_pedimentos.cantidad });
                log.audit({ title: 'oldValue', details: oldValue });
                ped_history.setValue({ fieldId: 'custrecord_efx_ped_newvalue', value: 0 });
            }

            ped_history.setValue({ fieldId: 'custrecord_efx_ped_h_pedimento', value: array_pedimentos.internalidMP });
            ped_history.setValue({ fieldId: 'custrecord_efx_ped_numpedimento', value: array_pedimentos.pedimento });
            var crea_h = ped_history.save();
            log.audit({ title: 'crea_historico', details: crea_h });
        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
