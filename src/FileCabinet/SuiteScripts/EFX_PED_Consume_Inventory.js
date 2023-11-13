/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @Author Marco Ramirez, Nicolás Castillo
 * @file Script para manejar las salidas de inventario de pedimentos (En inventory adjustment solo funciona cuando
 * el valor es negativo)
 */
define(['N/record', 'N/search', 'N/file'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search,file) => {
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
         * @overview Se encarga de manejar el escenario en el que se elimina un item receipt de un recibo que traia
         * pedimentos. Se encarga de deshacer el movimiento en los record de pedimentos (maestro e historial)
         */
        const beforeSubmit = (scriptContext) => {
            //log.debug({title: 'ENTERED BEFORE SUBMIT', details: ''});
            var record_obj = scriptContext.oldRecord;
            var recType = scriptContext.newRecord.type;
            //log.debug({title: 'recType: ' + recType, details: ''});
            if (scriptContext.type == scriptContext.UserEventType.DELETE && recType == record.Type.ITEM_RECEIPT) {
                log.debug({title: 'El contexto es DELETE', details: ''});
            sublista = 'item';
            campo_cantidad = 'quantity';
            campo_rate = 'rate';

            var numero_p_linea = record_obj.getSublistValue({
                    sublistId: sublista,
                    fieldId: 'custcol_efx_ped_numero_pedimento',
                    line: 0
                }) || '';

            if(numero_p_linea){
                var conteoLine = record_obj.getLineCount({sublistId: sublista});
                log.audit({title: 'conteoLine', details: conteoLine});
                var objPedimento = {
                    pedimento: '',
                    cantidad: '',
                    item: '',
                    linea: '',
                    ubicacion:'',
                    rate:''
                }
                var arrayPedimento = new Array();

                for (var i = 0; i < conteoLine; i++) {
                    // log.debug({title: 'Valor de objPedimento antes de iniciar iteracion' +
                    // JSON.stringify(objPedimento), details: ''});
                    var numero_p_linea = record_obj.getSublistValue({
                        sublistId: sublista,
                        fieldId: 'custcol_efx_ped_numero_pedimento',
                        line: i
                    }) || '';

                    var cantidad_pedimento = parseFloat(record_obj.getSublistValue({
                        sublistId: sublista,
                        fieldId: campo_cantidad,
                        line: i
                    })) || 0;

                    //cantidad_pedimento = cantidad_pedimento * (-1);

                    var contiene_pedimento = record_obj.getSublistValue({
                        sublistId: sublista,
                        fieldId: 'custcol_efx_ped_contains',
                        line: i
                    }) || false;

                    var item_pedimento = record_obj.getSublistValue({
                        sublistId: sublista,
                        fieldId: 'item',
                        line: i
                    }) || 0;

                    var rate_pedimento = record_obj.getSublistValue({
                        sublistId: sublista,
                        fieldId: campo_rate,
                        line: i
                    }) || 0;


                        // var ubicacion_pedimento = record_obj.getSublistValue({
                        //     sublistId: sublista,
                        //     fieldId: 'location',
                        //     line: i
                        // }) || 0;
                        if(contiene_pedimento) {
                            //Si el ajuste es negativo y se trata de un Inventory adjustment
                            if (cantidad_pedimento > 0) {
                                objPedimento.pedimento = numero_p_linea;
                                objPedimento.cantidad = cantidad_pedimento;
                                // log.debug({title: 'CANTIDAD en esta iteracion agregada al objeto: ' +
                                // cantidad_pedimento, details: ''});
                                objPedimento.item = item_pedimento;
                                // log.debug({title: 'ITEM en esta iteracion agregada al objeto: ' +
                                // item_pedimento, details: ''});
                                //objPedimento.ubicacion = ubicacion_pedimento;
                                // log.debug({title: 'Valor de OBJPedimento antes de asignar linea '+
                                // objPedimento.linea, details: ''});
                                // log.debug({title: 'ESTAMOS RECORRIENDO LA LINEA '+ i, details: ''});
                                objPedimento.linea = i;
                                // log.debug({title: 'Valor de OBJPedimento despues de asignar linea '+
                                // objPedimento.linea, details: ''});
                                objPedimento.rate = rate_pedimento;
                                // log.debug({title: 'objPedimento ya formado a meter: ' +
                                // JSON.stringify(objPedimento), details: ''});
                                arrayPedimento.push(objPedimento);


                                //Limpíar el objeto para siguiente iteracion
                                var objPedimento = {
                                    pedimento: '',
                                    cantidad: '',
                                    item: '',
                                    linea: '',
                                    ubicacion:'',
                                    rate:''
                                };
                            }
                        }

                    //Termina el for que recorre las lineas

                }

                // //Guardar log en archivo de texto para verlo todo
                var fileObj = file.create({
                    name    : 'testlog.txt',
                    fileType: file.Type.PLAINTEXT,
                    contents: JSON.stringify(arrayPedimento) + '     '
                });
                fileObj.folder = '-15';
                var fileId = fileObj.save();


                //YA con array_Pedimento ahora todo el codigo de abajo va a hacer los movimientos de pedimento
                //********************************************************************************************************

                if(arrayPedimento.length>0) {
                    log.audit({title: 'arrayPedimento', details: arrayPedimento});
                    var filtros_pedimento = new Array();
                    for (var i = 0; i < arrayPedimento.length; i++) {
                        var filtro = [['custrecord_exf_ped_item', search.Operator.IS, arrayPedimento[i].item]];
                        filtros_pedimento.push(filtro);
                        var conteo = i + 1;
                        if (conteo < arrayPedimento.length) {
                            filtros_pedimento.push('OR');
                        }
                    }
                    log.audit({title: 'filtros_pedimento', details: filtros_pedimento});

                    var buscaPed = search.create({
                        type: 'customrecord_efx_ped_master_record',
                        filters: [
                            ['isinactive', search.Operator.IS, 'F']
                            , 'AND',
                            ['custrecord_efx_ped_available', search.Operator.ISNOT, '0.0']
                            , 'AND',
                            filtros_pedimento
                        ],
                        columns: [
                            search.createColumn({name: 'created', sort: search.Sort.ASC}),
                            search.createColumn({name: 'custrecord_efx_ped_number'}),
                            search.createColumn({name: 'custrecord_exf_ped_item'}),
                            search.createColumn({name: 'custrecord_efx_ped_available'}),
                            search.createColumn({name: 'custrecord_efx_ped_exchange'}),
                            search.createColumn({name: 'custrecord_efx_ped_price'}),
                            search.createColumn({name: 'custrecord_efx_ped_total'}),
                            search.createColumn({name: 'internalid'}),
                        ],
                    });

                    log.audit({title: 'buscaPed', details: buscaPed});
                    var ejecutar_pedimento = buscaPed.run();
                    log.audit({title: 'ejecutar_pedimento', details: ejecutar_pedimento});
                    var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);

                    log.audit({title: 'resultado_pedimento', details: resultado_pedimento.length});
                    var array_busqueda_ped = new Array();
                    for (var i = 0; i < resultado_pedimento.length; i++) {
                        var obj_busca_ped = {
                            created:'',
                            custrecord_efx_ped_number:'',
                            custrecord_exf_ped_item:'',
                            custrecord_efx_ped_available:'',
                            custrecord_efx_ped_exchange:'',
                            custrecord_efx_ped_price:'',
                            custrecord_efx_ped_total:'',
                            internalid:''
                        }
                        obj_busca_ped.created = resultado_pedimento[i].getValue({name: 'created'}) || '';
                        obj_busca_ped.custrecord_efx_ped_number = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_number'}) || '';
                        obj_busca_ped.custrecord_exf_ped_item = resultado_pedimento[i].getValue({name: 'custrecord_exf_ped_item'}) || '';
                        obj_busca_ped.custrecord_efx_ped_available = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_available'}) || '';
                        obj_busca_ped.custrecord_efx_ped_exchange = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_exchange'}) || '';
                        obj_busca_ped.custrecord_efx_ped_price = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_price'}) || '';
                        obj_busca_ped.custrecord_efx_ped_total = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_total'}) || '';
                        obj_busca_ped.internalid = resultado_pedimento[i].getValue({name: 'internalid'}) || '';
                        array_busqueda_ped.push(obj_busca_ped);
                    }
                    log.audit({title: 'array_busqueda_ped', details: array_busqueda_ped});

                    var array_lineas = new Array();
                    for (var x = 0; x < arrayPedimento.length; x++) {


                        for (var i = 0; i < array_busqueda_ped.length; i++) {
                            var item_master = array_busqueda_ped[i].custrecord_exf_ped_item || '';
                            var id_pedimento = array_busqueda_ped[i].internalid || '';
                            var numero_pedimento = array_busqueda_ped[i].custrecord_efx_ped_number || '';
                            var cantidad_master = parseFloat(array_busqueda_ped[i].custrecord_efx_ped_available) || 0;
                            var precio_master = parseFloat(array_busqueda_ped[i].custrecord_efx_ped_price) || 0;

                            if (cantidad_master > 0 && item_master == arrayPedimento[x].item) {
                                arrayPedimento[x].numeroPedimento = numero_pedimento;
                                var obj_lineas = {
                                    item: '',
                                    cantidad: '',
                                    linea: '',
                                    ubicacion:'',
                                }
                                var cantidad_transaccion = parseFloat(arrayPedimento[x].cantidad);
                                if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                    cantidad_transaccion = cantidad_transaccion * (-1);
                                }
                                var cantidad_nueva = cantidad_master - cantidad_transaccion;


                                log.audit({title: 'cantidad_nueva_ver', details: cantidad_nueva});
                                if (cantidad_nueva < 0) {
                                    obj_lineas.item = arrayPedimento[x].item;
                                    obj_lineas.cantidad = cantidad_nueva;
                                    obj_lineas.linea = arrayPedimento[x].linea;
                                    if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                        obj_lineas.ubicacion = arrayPedimento[x].ubicacion;
                                    }
                                    actualizaPedimento(id_pedimento, '0.0', precio_master);
                                    historicoPedimento(record_now.id,arrayPedimento[x],id_pedimento,cantidad_master,0);
                                    array_busqueda_ped[i].custrecord_efx_ped_available = 0;
                                    array_lineas.push(obj_lineas);

                                    if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                        var cantidad_p = obj_lineas.cantidad * (-1);
                                        var cantidad_t_nueva = cantidad_transaccion - cantidad_p;
                                        cantidad_t_nueva = cantidad_t_nueva * (-1);
                                    }else{
                                        var cantidad_t_nueva = cantidad_transaccion - obj_lineas.cantidad;
                                    }

                                    record_obj.setSublistValue({
                                        sublistId: sublista,
                                        fieldId: 'custcol_efx_ped_numero_pedimento',
                                        value: numero_pedimento,
                                        line: x
                                    });

                                    record_obj.setSublistValue({
                                        sublistId: sublista,
                                        fieldId: campo_cantidad,
                                        value: cantidad_t_nueva,
                                        line: x
                                    });


                                } else {
                                    //FALLA EN LA 285 PORQUE RECORD_NOW NO ESTA DEFINIDO. como extra al final de
                                    // todo el bloque de codigo hay un save no se para que
                                    actualizaPedimento(id_pedimento, cantidad_nueva, precio_master);
                                    historicoPedimento(record_obj.id,arrayPedimento[x],id_pedimento,cantidad_master,cantidad_nueva);
                                    log.audit({title:'cantidad_nueva_a',details:cantidad_nueva});
                                    try{
                                        array_busqueda_ped[i].custrecord_efx_ped_available = cantidad_nueva;
                                    }catch (e){
                                        log.audit({title:'e',details:e});
                                    }

                                    record_obj.setSublistValue({
                                        sublistId: sublista,
                                        fieldId: 'custcol_efx_ped_numero_pedimento',
                                        value: numero_pedimento,
                                        line: x
                                    });


                                }
                                break;
                            }
                        }
                    }

                    //busqueda y actualizacion si un pedimento llego a 0 y faltaron articulos para crear mas lineas
                    //recorrer arreglo de lineas nuevas e ir restando de los pedimentos hasta consumirlas todas, si no
                    // hay mas pedimentos se quedan vacias

                    log.audit({title:'array_lineas',details:array_lineas});
                    if (array_lineas.length > 0) {
                        var filtros_pedimento = new Array();
                        for (var i = 0; i < array_lineas.length; i++) {
                            var filtro = [['custrecord_exf_ped_item', search.Operator.IS, array_lineas[i].item]];
                            filtros_pedimento.push(filtro);
                            var conteo = i + 1;
                            if (conteo < array_lineas.length) {
                                filtros_pedimento.push('OR');
                            }
                        }
                        log.audit({title: 'filtros_pedimento_lineas', details: filtros_pedimento});

                        var buscaPed = search.create({
                            type: 'customrecord_efx_ped_master_record',
                            filters: [
                                ['isinactive', search.Operator.IS, 'F']
                                , 'AND',
                                ['custrecord_efx_ped_available', search.Operator.ISNOT, '0.0']
                                , 'AND',
                                filtros_pedimento
                            ],
                            columns: [
                                search.createColumn({name: 'created', sort: search.Sort.ASC}),
                                search.createColumn({name: 'custrecord_efx_ped_number'}),
                                search.createColumn({name: 'custrecord_exf_ped_item'}),
                                search.createColumn({name: 'custrecord_efx_ped_available'}),
                                search.createColumn({name: 'custrecord_efx_ped_exchange'}),
                                search.createColumn({name: 'custrecord_efx_ped_price'}),
                                search.createColumn({name: 'custrecord_efx_ped_total'}),
                                search.createColumn({name: 'internalid'}),
                            ],
                        });

                        log.audit({title: 'buscaPed', details: buscaPed});
                        var ejecutar_pedimento = buscaPed.run();
                        log.audit({title: 'ejecutar_pedimento', details: ejecutar_pedimento});
                        var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);

                        log.audit({title: 'resultado_pedimento', details: resultado_pedimento.length});

                        var array_busqueda_ped = new Array();
                        for (var i = 0; i < resultado_pedimento.length; i++) {
                            var obj_busca_ped = {
                                created:'',
                                custrecord_efx_ped_number:'',
                                custrecord_exf_ped_item:'',
                                custrecord_efx_ped_available:'',
                                custrecord_efx_ped_exchange:'',
                                custrecord_efx_ped_price:'',
                                custrecord_efx_ped_total:'',
                                internalid:''
                            }
                            obj_busca_ped.created = resultado_pedimento[i].getValue({name: 'created'}) || '';
                            obj_busca_ped.custrecord_efx_ped_number = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_number'}) || '';
                            obj_busca_ped.custrecord_exf_ped_item = resultado_pedimento[i].getValue({name: 'custrecord_exf_ped_item'}) || '';
                            obj_busca_ped.custrecord_efx_ped_available = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_available'}) || '';
                            obj_busca_ped.custrecord_efx_ped_exchange = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_exchange'}) || '';
                            obj_busca_ped.custrecord_efx_ped_price = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_price'}) || '';
                            obj_busca_ped.custrecord_efx_ped_total = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_total'}) || '';
                            obj_busca_ped.internalid = resultado_pedimento[i].getValue({name: 'internalid'}) || '';
                            array_busqueda_ped.push(obj_busca_ped);
                        }

                        var array_elimina = new Array();
                        for (var p = 0; p < array_lineas.length; p++) {
                            var cantidad_lineas = array_lineas[p].cantidad;
                            if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                cantidad_lineas = array_lineas[p].cantidad * (-1);
                            }

                            for (var y = 0; y < array_busqueda_ped.length; y++) {

                                var item_master = array_busqueda_ped[y].custrecord_exf_ped_item || '';
                                var id_pedimento = array_busqueda_ped[y].internalid || '';
                                var cantidad_master = parseFloat(array_busqueda_ped[y].custrecord_efx_ped_available) || 0;
                                var precio_master = parseFloat(array_busqueda_ped[y].custrecord_efx_ped_price) || 0;
                                var numero_pedimento = array_busqueda_ped[y].custrecord_efx_ped_number || '';

                                if (item_master == array_lineas[p].item && cantidad_master>0) {
                                    array_lineas[p].numeroPedimento=numero_pedimento;
                                    var cantidad_nueva_linea = cantidad_master - cantidad_lineas;
                                    //-5
                                    log.audit({title: 'cantidad_nueva_linea', details: cantidad_nueva_linea});
                                    if (cantidad_nueva_linea < 0) {
                                        record_obj.insertLine({
                                            sublistId: sublista,
                                            line: 0,
                                        });
                                        record_obj.setSublistValue({
                                            sublistId: sublista,
                                            fieldId: 'item',
                                            line:0,
                                            value: array_lineas[p].item
                                        });

                                        record_obj.setSublistValue({
                                            sublistId: sublista,
                                            fieldId: campo_cantidad,
                                            line:0,
                                            value: array_lineas[p].cantidad - cantidad_nueva_linea
                                        });

                                        record_obj.setSublistValue({
                                            sublistId: sublista,
                                            fieldId: 'custcol_efx_ped_numero_pedimento',
                                            value: numero_pedimento,
                                            line: 0
                                        });

                                        record_obj.setSublistValue({
                                            sublistId: sublista,
                                            fieldId: 'location',
                                            line:0,
                                            value: array_lineas[p].ubicacion
                                        });

                                        array_lineas[p].cantidad = cantidad_nueva_linea;
                                        array_busqueda_ped[y].custrecord_efx_ped_available = 0;
                                        actualizaPedimento(id_pedimento, '0.0', precio_master);
                                        historicoPedimento(record_now.id,array_lineas[p],id_pedimento,cantidad_master,0);
                                        array_elimina.push(y);
                                    } else {
                                        record_obj.insertLine({
                                            sublistId: sublista,
                                            line: 0,
                                        });
                                        record_obj.setSublistValue({
                                            sublistId: sublista,
                                            fieldId: 'item',
                                            line:0,
                                            value: array_lineas[p].item
                                        });

                                        record_obj.setSublistValue({
                                            sublistId: sublista,
                                            fieldId: campo_cantidad,
                                            line:0,
                                            value: array_lineas[p].cantidad
                                        });

                                        record_obj.setSublistValue({
                                            sublistId: sublista,
                                            fieldId: 'custcol_efx_ped_numero_pedimento',
                                            value: numero_pedimento,
                                            line: 0
                                        });

                                        record_obj.setSublistValue({
                                            sublistId: sublista,
                                            fieldId: 'location',
                                            line:0,
                                            value: array_lineas[p].ubicacion
                                        });

                                        actualizaPedimento(id_pedimento, cantidad_nueva_linea, precio_master);
                                        historicoPedimento(record_now.id,array_lineas[p],id_pedimento,cantidad_master,cantidad_nueva_linea);
                                    }

                                }
                            }
                            log.audit({title: 'array_elimina', details: array_elimina});
                            log.audit({title: 'array_busqueda_ped', details: array_busqueda_ped});
                            if(array_elimina.length>0){
                                for(var i=0;i<array_elimina.length;i++){
                                    array_busqueda_ped.splice(array_elimina[i],1);
                                }
                            }

                            log.audit({title: 'array_busqueda_ped.length', details: array_busqueda_ped.length});
                            log.audit({title: 'array_lineas[p].cantidad', details: array_lineas[p].cantidad});
                            // if(array_busqueda_ped.length==0 && array_lineas[p].cantidad!=0){
                            //     log.audit({title: 'entracrea', details: 'entra'});
                            //     record_obj.insertLine({
                            //         sublistId: sublista,
                            //         line: 0,
                            //     });
                            //     record_obj.setSublistValue({
                            //         sublistId: sublista,
                            //         fieldId: 'item',
                            //         line:0,
                            //         value: array_lineas[p].item
                            //     });
                            //
                            //     record_obj.setSublistValue({
                            //         sublistId: sublista,
                            //         fieldId: campo_cantidad,
                            //         line:0,
                            //         value: array_lineas[p].cantidad
                            //     });
                            //
                            //     record_obj.setSublistValue({
                            //         sublistId: sublista,
                            //         fieldId: 'custcol_efx_ped_numero_pedimento',
                            //         value: '',
                            //         line: 0
                            //     });
                            //
                            //     record_obj.setSublistValue({
                            //         sublistId: sublista,
                            //         fieldId: 'location',
                            //         line:0,
                            //         value: array_lineas[p].ubicacion
                            //     });
                            //     continue;
                            // }

                        }
                    }
                }

                record_obj.save();


                //*-*-*--*-*-*-*-*-*-*-*-*-*-*-*-*-**********************************************************************








            }

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
                if (scriptContext.type == scriptContext.UserEventType.CREATE) {
                    var record_now = scriptContext.newRecord;
                    var recType = record_now.type;

                    if (recType == record.Type.INVENTORY_ADJUSTMENT || recType == record.Type.INVOICE || recType == record.Type.VENDOR_CREDIT || recType == record.Type.CASH_SALE) {

                        var sublista = '';
                        var campo_rate = '';
                        var campo_cantidad = '';

                        if (recType == record.Type.INVOICE || recType == record.Type.VENDOR_CREDIT || recType == record.Type.CASH_SALE) {
                            sublista = 'item';
                            campo_cantidad = 'quantity';
                            campo_rate = 'rate';

                            var record_obj = record.load({
                                type:recType,
                                id:record_now.id
                            });
                        }

                        if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                            sublista = 'inventory';
                            campo_cantidad = 'adjustqtyby';
                            campo_rate = 'unitcost';

                            var record_obj = record.load({
                                type:recType,
                                id:record_now.id
                            });
                        }

                        var conteoLine = record_obj.getLineCount({sublistId: sublista});
                        log.audit({title: 'conteoLine', details: conteoLine});
                        var objPedimento = {
                            pedimento: '',
                            cantidad: '',
                            item: '',
                            linea: '',
                            ubicacion:'',
                            rate:''
                        };
                        var arrayPedimento = new Array();

                        for (var i = 0; i < conteoLine; i++) {
                           // log.debug({title: 'Valor de objPedimento antes de iniciar iteracion' +
                            // JSON.stringify(objPedimento), details: ''});
                            var numero_p_linea = record_obj.getSublistValue({
                                sublistId: sublista,
                                fieldId: 'custcol_efx_ped_numero_pedimento',
                                line: i
                            }) || '';

                            var cantidad_pedimento = parseFloat(record_obj.getSublistValue({
                                sublistId: sublista,
                                fieldId: campo_cantidad,
                                line: i
                            })) || 0;

                            var contiene_pedimento = record_obj.getSublistValue({
                                sublistId: sublista,
                                fieldId: 'custcol_efx_ped_contains',
                                line: i
                            }) || false;

                            var item_pedimento = record_obj.getSublistValue({
                                sublistId: sublista,
                                fieldId: 'item',
                                line: i
                            }) || 0;

                            var rate_pedimento = record_obj.getSublistValue({
                                sublistId: sublista,
                                fieldId: campo_rate,
                                line: i
                            }) || 0;

                            if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                var ubicacion_pedimento = record_obj.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: 'location',
                                    line: i
                                }) || 0;
                                if(contiene_pedimento) {
                                    //Si el ajuste es negativo y se trata de un Inventory adjustment
                                    if (cantidad_pedimento < 0) {
                                        objPedimento.pedimento = numero_p_linea;
                                        objPedimento.cantidad = cantidad_pedimento;
                                       // log.debug({title: 'CANTIDAD en esta iteracion agregada al objeto: ' +
                                        // cantidad_pedimento, details: ''});
                                        objPedimento.item = item_pedimento;
                                       // log.debug({title: 'ITEM en esta iteracion agregada al objeto: ' +
                                        // item_pedimento, details: ''});
                                        objPedimento.ubicacion = ubicacion_pedimento;
                                       // log.debug({title: 'Valor de OBJPedimento antes de asignar linea '+
                                        // objPedimento.linea, details: ''});
                                       // log.debug({title: 'ESTAMOS RECORRIENDO LA LINEA '+ i, details: ''});
                                        objPedimento.linea = i;
                                       // log.debug({title: 'Valor de OBJPedimento despues de asignar linea '+
                                        // objPedimento.linea, details: ''});
                                        objPedimento.rate = rate_pedimento;
                                       // log.debug({title: 'objPedimento ya formado a meter: ' +
                                        // JSON.stringify(objPedimento), details: ''});
                                        arrayPedimento.push(objPedimento);


                                        //Limpíar el objeto para siguiente iteracion
                                        var objPedimento = {
                                            pedimento: '',
                                            cantidad: '',
                                            item: '',
                                            linea: '',
                                            ubicacion:'',
                                            rate:''
                                        }
                                    }
                                }
                            } else {

                                if(contiene_pedimento) {
                                    objPedimento.pedimento = numero_p_linea;
                                    objPedimento.cantidad = cantidad_pedimento;
                                    objPedimento.item = item_pedimento;
                                    objPedimento.linea = i;
                                    objPedimento.rate = rate_pedimento;
                                    arrayPedimento.push(objPedimento);
                                }

                            }
                        //Termina el for que recorre las lineas




                        }

                        // //Guardar log en archivo de texto para verlo todo
                        // var fileObj = file.create({
                        //     name    : 'testlog.txt',
                        //     fileType: file.Type.PLAINTEXT,
                        //     contents: JSON.stringify(arrayPedimento) + '     '
                        // });
                        // fileObj.folder = '-15';
                        // var fileId = fileObj.save();


                        //En si al script se le entrega un array de objetos de los pedimentos a borrar




                        //Validacion extra, deberia ser true siempre
                        if(arrayPedimento.length>0) {
                            log.audit({title: 'arrayPedimento', details: arrayPedimento});
                            var filtros_pedimento = new Array();
                            for (var i = 0; i < arrayPedimento.length; i++) {
                                var filtro = [['custrecord_exf_ped_item', search.Operator.IS, arrayPedimento[i].item]];
                                filtros_pedimento.push(filtro);
                                var conteo = i + 1;
                                if (conteo < arrayPedimento.length) {
                                    filtros_pedimento.push('OR');
                                }
                            }
                            log.audit({title: 'filtros_pedimento', details: filtros_pedimento});

                            var buscaPed = search.create({
                                type: 'customrecord_efx_ped_master_record',
                                filters: [
                                    ['isinactive', search.Operator.IS, 'F']
                                    , 'AND',
                                    ['custrecord_efx_ped_available', search.Operator.ISNOT, '0.0']
                                    , 'AND',
                                    filtros_pedimento
                                ],
                                columns: [
                                    search.createColumn({name: 'created', sort: search.Sort.ASC}),
                                    search.createColumn({name: 'custrecord_efx_ped_number'}),
                                    search.createColumn({name: 'custrecord_exf_ped_item'}),
                                    search.createColumn({name: 'custrecord_efx_ped_available'}),
                                    search.createColumn({name: 'custrecord_efx_ped_exchange'}),
                                    search.createColumn({name: 'custrecord_efx_ped_price'}),
                                    search.createColumn({name: 'custrecord_efx_ped_total'}),
                                    search.createColumn({name: 'internalid'}),
                                ],
                            });

                            log.audit({title: 'buscaPed', details: buscaPed});
                            var ejecutar_pedimento = buscaPed.run();
                            log.audit({title: 'ejecutar_pedimento', details: ejecutar_pedimento});
                            var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);

                            log.audit({title: 'resultado_pedimento', details: resultado_pedimento.length});
                            var array_busqueda_ped = new Array();
                            for (var i = 0; i < resultado_pedimento.length; i++) {
                                var obj_busca_ped = {
                                    created:'',
                                    custrecord_efx_ped_number:'',
                                    custrecord_exf_ped_item:'',
                                    custrecord_efx_ped_available:'',
                                    custrecord_efx_ped_exchange:'',
                                    custrecord_efx_ped_price:'',
                                    custrecord_efx_ped_total:'',
                                    internalid:''
                                }
                                obj_busca_ped.created = resultado_pedimento[i].getValue({name: 'created'}) || '';
                                obj_busca_ped.custrecord_efx_ped_number = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_number'}) || '';
                                obj_busca_ped.custrecord_exf_ped_item = resultado_pedimento[i].getValue({name: 'custrecord_exf_ped_item'}) || '';
                                obj_busca_ped.custrecord_efx_ped_available = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_available'}) || '';
                                obj_busca_ped.custrecord_efx_ped_exchange = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_exchange'}) || '';
                                obj_busca_ped.custrecord_efx_ped_price = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_price'}) || '';
                                obj_busca_ped.custrecord_efx_ped_total = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_total'}) || '';
                                obj_busca_ped.internalid = resultado_pedimento[i].getValue({name: 'internalid'}) || '';
                                array_busqueda_ped.push(obj_busca_ped);
                            }
                            log.audit({title: 'array_busqueda_ped', details: array_busqueda_ped});

                            var array_lineas = new Array();
                            for (var x = 0; x < arrayPedimento.length; x++) {


                                for (var i = 0; i < array_busqueda_ped.length; i++) {
                                    var item_master = array_busqueda_ped[i].custrecord_exf_ped_item || '';
                                    var id_pedimento = array_busqueda_ped[i].internalid || '';
                                    var numero_pedimento = array_busqueda_ped[i].custrecord_efx_ped_number || '';
                                    var cantidad_master = parseFloat(array_busqueda_ped[i].custrecord_efx_ped_available) || 0;
                                    var precio_master = parseFloat(array_busqueda_ped[i].custrecord_efx_ped_price) || 0;

                                    if (cantidad_master > 0 && item_master == arrayPedimento[x].item) {
                                        arrayPedimento[x].numeroPedimento = numero_pedimento;
                                        var obj_lineas = {
                                            item: '',
                                            cantidad: '',
                                            linea: '',
                                            ubicacion:'',
                                        }
                                        var cantidad_transaccion = parseFloat(arrayPedimento[x].cantidad);
                                        if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                            cantidad_transaccion = cantidad_transaccion * (-1);
                                        }
                                        var cantidad_nueva = cantidad_master - cantidad_transaccion;


                                        log.audit({title: 'cantidad_nueva_ver', details: cantidad_nueva});
                                        if (cantidad_nueva < 0) {
                                            obj_lineas.item = arrayPedimento[x].item;
                                            obj_lineas.cantidad = cantidad_nueva;
                                            obj_lineas.linea = arrayPedimento[x].linea;
                                            if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                                obj_lineas.ubicacion = arrayPedimento[x].ubicacion;
                                            }
                                            actualizaPedimento(id_pedimento, '0.0', precio_master);
                                            historicoPedimento(record_now.id,arrayPedimento[x],id_pedimento,cantidad_master,0);
                                            array_busqueda_ped[i].custrecord_efx_ped_available = 0;
                                            array_lineas.push(obj_lineas);

                                            if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                                var cantidad_p = obj_lineas.cantidad * (-1);
                                                var cantidad_t_nueva = cantidad_transaccion - cantidad_p;
                                                cantidad_t_nueva = cantidad_t_nueva * (-1);
                                            }else{
                                                var cantidad_t_nueva = cantidad_transaccion - obj_lineas.cantidad;
                                            }

                                            record_obj.setSublistValue({
                                                sublistId: sublista,
                                                fieldId: 'custcol_efx_ped_numero_pedimento',
                                                value: numero_pedimento,
                                                line: x
                                            });

                                            record_obj.setSublistValue({
                                                sublistId: sublista,
                                                fieldId: campo_cantidad,
                                                value: cantidad_t_nueva,
                                                line: x
                                            });


                                        } else {
                                            actualizaPedimento(id_pedimento, cantidad_nueva, precio_master);
                                            historicoPedimento(record_now.id,arrayPedimento[x],id_pedimento,cantidad_master,cantidad_nueva);
                                            log.audit({title:'cantidad_nueva_a',details:cantidad_nueva});
                                            try{
                                                array_busqueda_ped[i].custrecord_efx_ped_available = cantidad_nueva;
                                            }catch (e){
                                                log.audit({title:'e',details:e});
                                            }

                                            record_obj.setSublistValue({
                                                sublistId: sublista,
                                                fieldId: 'custcol_efx_ped_numero_pedimento',
                                                value: numero_pedimento,
                                                line: x
                                            });


                                        }
                                        break;
                                    }
                                }
                            }

                            //busqueda y actualizacion si un pedimento llego a 0 y faltaron articulos para crear mas lineas
                            //recorrer arreglo de lineas nuevas e ir restando de los pedimentos hasta consumirlas todas, si no
                            // hay mas pedimentos se quedan vacias

                            log.audit({title:'array_lineas',details:array_lineas});
                            if (array_lineas.length > 0) {
                                var filtros_pedimento = new Array();
                                for (var i = 0; i < array_lineas.length; i++) {
                                    var filtro = [['custrecord_exf_ped_item', search.Operator.IS, array_lineas[i].item]];
                                    filtros_pedimento.push(filtro);
                                    var conteo = i + 1;
                                    if (conteo < array_lineas.length) {
                                        filtros_pedimento.push('OR');
                                    }
                                }
                                log.audit({title: 'filtros_pedimento_lineas', details: filtros_pedimento});

                                var buscaPed = search.create({
                                    type: 'customrecord_efx_ped_master_record',
                                    filters: [
                                        ['isinactive', search.Operator.IS, 'F']
                                        , 'AND',
                                        ['custrecord_efx_ped_available', search.Operator.ISNOT, '0.0']
                                        , 'AND',
                                        filtros_pedimento
                                    ],
                                    columns: [
                                        search.createColumn({name: 'created', sort: search.Sort.ASC}),
                                        search.createColumn({name: 'custrecord_efx_ped_number'}),
                                        search.createColumn({name: 'custrecord_exf_ped_item'}),
                                        search.createColumn({name: 'custrecord_efx_ped_available'}),
                                        search.createColumn({name: 'custrecord_efx_ped_exchange'}),
                                        search.createColumn({name: 'custrecord_efx_ped_price'}),
                                        search.createColumn({name: 'custrecord_efx_ped_total'}),
                                        search.createColumn({name: 'internalid'}),
                                    ],
                                });

                                log.audit({title: 'buscaPed', details: buscaPed});
                                var ejecutar_pedimento = buscaPed.run();
                                log.audit({title: 'ejecutar_pedimento', details: ejecutar_pedimento});
                                var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);

                                log.audit({title: 'resultado_pedimento', details: resultado_pedimento.length});

                                var array_busqueda_ped = new Array();
                                for (var i = 0; i < resultado_pedimento.length; i++) {
                                    var obj_busca_ped = {
                                        created:'',
                                        custrecord_efx_ped_number:'',
                                        custrecord_exf_ped_item:'',
                                        custrecord_efx_ped_available:'',
                                        custrecord_efx_ped_exchange:'',
                                        custrecord_efx_ped_price:'',
                                        custrecord_efx_ped_total:'',
                                        internalid:''
                                    }
                                    obj_busca_ped.created = resultado_pedimento[i].getValue({name: 'created'}) || '';
                                    obj_busca_ped.custrecord_efx_ped_number = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_number'}) || '';
                                    obj_busca_ped.custrecord_exf_ped_item = resultado_pedimento[i].getValue({name: 'custrecord_exf_ped_item'}) || '';
                                    obj_busca_ped.custrecord_efx_ped_available = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_available'}) || '';
                                    obj_busca_ped.custrecord_efx_ped_exchange = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_exchange'}) || '';
                                    obj_busca_ped.custrecord_efx_ped_price = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_price'}) || '';
                                    obj_busca_ped.custrecord_efx_ped_total = resultado_pedimento[i].getValue({name: 'custrecord_efx_ped_total'}) || '';
                                    obj_busca_ped.internalid = resultado_pedimento[i].getValue({name: 'internalid'}) || '';
                                    array_busqueda_ped.push(obj_busca_ped);
                                }

                                var array_elimina = new Array();
                                for (var p = 0; p < array_lineas.length; p++) {
                                    var cantidad_lineas = array_lineas[p].cantidad;
                                    if (recType == record.Type.INVENTORY_ADJUSTMENT) {
                                        cantidad_lineas = array_lineas[p].cantidad * (-1);
                                    }

                                    for (var y = 0; y < array_busqueda_ped.length; y++) {

                                        var item_master = array_busqueda_ped[y].custrecord_exf_ped_item || '';
                                        var id_pedimento = array_busqueda_ped[y].internalid || '';
                                        var cantidad_master = parseFloat(array_busqueda_ped[y].custrecord_efx_ped_available) || 0;
                                        var precio_master = parseFloat(array_busqueda_ped[y].custrecord_efx_ped_price) || 0;
                                        var numero_pedimento = array_busqueda_ped[y].custrecord_efx_ped_number || '';

                                        if (item_master == array_lineas[p].item && cantidad_master>0) {
                                            array_lineas[p].numeroPedimento=numero_pedimento;
                                            var cantidad_nueva_linea = cantidad_master - cantidad_lineas;
                                            //-5
                                            log.audit({title: 'cantidad_nueva_linea', details: cantidad_nueva_linea});
                                            if (cantidad_nueva_linea < 0) {
                                                record_obj.insertLine({
                                                    sublistId: sublista,
                                                    line: 0,
                                                });
                                                record_obj.setSublistValue({
                                                    sublistId: sublista,
                                                    fieldId: 'item',
                                                    line:0,
                                                    value: array_lineas[p].item
                                                });

                                                record_obj.setSublistValue({
                                                    sublistId: sublista,
                                                    fieldId: campo_cantidad,
                                                    line:0,
                                                    value: array_lineas[p].cantidad - cantidad_nueva_linea
                                                });

                                                record_obj.setSublistValue({
                                                    sublistId: sublista,
                                                    fieldId: 'custcol_efx_ped_numero_pedimento',
                                                    value: numero_pedimento,
                                                    line: 0
                                                });

                                                record_obj.setSublistValue({
                                                    sublistId: sublista,
                                                    fieldId: 'location',
                                                    line:0,
                                                    value: array_lineas[p].ubicacion
                                                });

                                                array_lineas[p].cantidad = cantidad_nueva_linea;
                                                array_busqueda_ped[y].custrecord_efx_ped_available = 0;
                                                actualizaPedimento(id_pedimento, '0.0', precio_master);
                                                historicoPedimento(record_now.id,array_lineas[p],id_pedimento,cantidad_master,0);
                                                array_elimina.push(y);
                                            } else {
                                                record_obj.insertLine({
                                                    sublistId: sublista,
                                                    line: 0,
                                                });
                                                record_obj.setSublistValue({
                                                    sublistId: sublista,
                                                    fieldId: 'item',
                                                    line:0,
                                                    value: array_lineas[p].item
                                                });

                                                record_obj.setSublistValue({
                                                    sublistId: sublista,
                                                    fieldId: campo_cantidad,
                                                    line:0,
                                                    value: array_lineas[p].cantidad
                                                });

                                                record_obj.setSublistValue({
                                                    sublistId: sublista,
                                                    fieldId: 'custcol_efx_ped_numero_pedimento',
                                                    value: numero_pedimento,
                                                    line: 0
                                                });

                                                record_obj.setSublistValue({
                                                    sublistId: sublista,
                                                    fieldId: 'location',
                                                    line:0,
                                                    value: array_lineas[p].ubicacion
                                                });

                                                actualizaPedimento(id_pedimento, cantidad_nueva_linea, precio_master);
                                                historicoPedimento(record_now.id,array_lineas[p],id_pedimento,cantidad_master,cantidad_nueva_linea);
                                            }

                                        }
                                    }
                                    log.audit({title: 'array_elimina', details: array_elimina});
                                    log.audit({title: 'array_busqueda_ped', details: array_busqueda_ped});
                                    if(array_elimina.length>0){
                                        for(var i=0;i<array_elimina.length;i++){
                                            array_busqueda_ped.splice(array_elimina[i],1);
                                        }
                                    }

                                    log.audit({title: 'array_busqueda_ped.length', details: array_busqueda_ped.length});
                                    log.audit({title: 'array_lineas[p].cantidad', details: array_lineas[p].cantidad});
                                    // if(array_busqueda_ped.length==0 && array_lineas[p].cantidad!=0){
                                    //     log.audit({title: 'entracrea', details: 'entra'});
                                    //     record_obj.insertLine({
                                    //         sublistId: sublista,
                                    //         line: 0,
                                    //     });
                                    //     record_obj.setSublistValue({
                                    //         sublistId: sublista,
                                    //         fieldId: 'item',
                                    //         line:0,
                                    //         value: array_lineas[p].item
                                    //     });
                                    //
                                    //     record_obj.setSublistValue({
                                    //         sublistId: sublista,
                                    //         fieldId: campo_cantidad,
                                    //         line:0,
                                    //         value: array_lineas[p].cantidad
                                    //     });
                                    //
                                    //     record_obj.setSublistValue({
                                    //         sublistId: sublista,
                                    //         fieldId: 'custcol_efx_ped_numero_pedimento',
                                    //         value: '',
                                    //         line: 0
                                    //     });
                                    //
                                    //     record_obj.setSublistValue({
                                    //         sublistId: sublista,
                                    //         fieldId: 'location',
                                    //         line:0,
                                    //         value: array_lineas[p].ubicacion
                                    //     });
                                    //     continue;
                                    // }

                                }
                            }
                        }
                        record_obj.save();
                    }
                }

            }catch(error_consumir){
                log.audit({title:'error_consumir',details:error_consumir});
            }
        }

        const actualizaPedimento = (id_pedimento,cantidad_nueva,precio_master) =>{
            log.audit({title:'id_pedimento',details:id_pedimento});
            log.audit({title:'cantidad_nueva',details:cantidad_nueva});
            log.audit({title:'precio_master',details:precio_master});
            var master_obj = record.load({
                type: 'customrecord_efx_ped_master_record',
                id:id_pedimento
            });
            var nuevo_total = 0;
            if(cantidad_nueva==0){
                nuevo_total = 0;
            }else {
                nuevo_total = precio_master*cantidad_nueva;
            }
            master_obj.setValue({fieldId:'custrecord_efx_ped_available',value:cantidad_nueva});
            master_obj.setValue({fieldId:'custrecord_efx_ped_total',value:nuevo_total});
            master_obj.save();
        }

        const historicoPedimento = (id_tran,array_pedimentos,idPedimentos,oldValue,cantidad_nueva) => {
            var ped_history = record.create({
                type: 'customrecord_efx_ped_record_history'
            });
            ped_history.setValue({fieldId: 'custrecord_efx_ped_related_tran', value: id_tran});
            ped_history.setValue({fieldId: 'custrecord_efx_ped_h_item', value: array_pedimentos.item});
            ped_history.setValue({
                fieldId: 'custrecord_efx_ped_h_quantity',
                value: array_pedimentos.cantidad
            });
            ped_history.setValue({fieldId: 'custrecord_efx_ped_h_oldvalue', value: oldValue});

            if(cantidad_nueva){
                log.audit({title:'oldValue',details:oldValue});
                log.audit({title:'cantidad_nueva',details:cantidad_nueva});

                ped_history.setValue({
                    fieldId: 'custrecord_efx_ped_newvalue',
                    value: parseFloat(cantidad_nueva)
                });
            }else{
                log.audit({title:'array_pedimentos.cantidad',details:array_pedimentos.cantidad});
                log.audit({title:'oldValue',details:oldValue});
                ped_history.setValue({
                    fieldId: 'custrecord_efx_ped_newvalue',
                    value: 0
                });
            }

            ped_history.setValue({fieldId: 'custrecord_efx_ped_h_pedimento', value: idPedimentos});
            ped_history.setValue({
                fieldId: 'custrecord_efx_ped_numpedimento',
                value: array_pedimentos.numeroPedimento
            });
            var crea_h = ped_history.save();
            log.audit({title:'crea_historico',details:crea_h});
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
