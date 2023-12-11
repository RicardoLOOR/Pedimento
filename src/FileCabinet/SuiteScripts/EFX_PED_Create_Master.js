/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @file Script para manejar entrada de pedimentos al sistema. Crea o actualiza pedimentos en el record Master de
 * pedimentos y registra el historial en record de historial
 */
define(['N/record','N/search', 'N/file'],
    /**
     * @param{record} record
     */
    (record,search, file) => {
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

            // log.audit({title: '/-/--/-/-/-/-/ITEM Receipt Loaded', details: ''});
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
            try{

                if (scriptContext.type == scriptContext.UserEventType.EDIT) {



                    var record_now = scriptContext.newRecord;
                    var recType = record_now.type;

                    var sublista = '';
                    var campo_rate = '';
                    var campo_cantidad = '';

                    if(recType==record.Type.CREDIT_MEMO){
                        sublista = 'item';
                        campo_cantidad = 'quantity';
                        campo_rate = 'rate';
                    }
                    if(recType==record.Type.ITEM_RECEIPT){
                        sublista = 'item';
                        campo_cantidad = 'quantity';
                        campo_rate = 'rate';
                    }
                    if(recType==record.Type.INVENTORY_ADJUSTMENT){
                        sublista = 'inventory';
                        campo_cantidad = 'adjustqtyby';
                        campo_rate = 'unitcost';
                    }

                    var conteoLine = record_now.getLineCount({sublistId:sublista});
                    log.audit({title: 'conteoLine', details:conteoLine})

                    var array_pedimentoObj =[];
                    for(var i=0;i<conteoLine;i++){
                        var pedimentoObj={
                            pedimento:'',
                            item:'',
                            cantidad:'',
                            costo:'',
                            total:'',
                            tienePedimento:'',
                            ubicacion:''
                        }


                        pedimentoObj.tienePedimento = record_now.getSublistValue({sublistId: sublista,fieldId: 'custcol_efx_ped_contains',line:i}) || '';
                        log.audit({title:'pedimentoObj.tienePedimento',details:pedimentoObj.tienePedimento});
                        var tipoItem = record_now.getSublistValue({sublistId: sublista,fieldId: 'itemtype',line:i}) || '';
                        var tipoQItem = record_now.getSublistValue({sublistId: sublista,fieldId: 'quantity',line:i}) || '';
                        var ubicacionLinea = record_now.getSublistValue({sublistId: sublista,fieldId: 'location',line:i}) || '';
                        var listaensa = [];

                        log.audit({title:'tipoItem',details:tipoItem});
                        if(pedimentoObj.tienePedimento) {
                            var ItemIdAssembly = record_now.getSublistValue({
                                sublistId: sublista,
                                fieldId: 'item',
                                line: i
                            }) || '';
                            log.audit({title:'ItemIdAssembly',details:ItemIdAssembly});
                            if(tipoItem=='Assembly'){
                                var assamblyload = record.load({
                                    type: 'assemblyitem',
                                    id: ItemIdAssembly,
                                    isDynamic: true,
                                });

                                var invAssLineCount2 = assamblyload.getLineCount({
                                    sublistId: 'billofmaterials'
                                });

                                log.audit({title:'invAssLineCount2',details:invAssLineCount2});
                                for(var iteraciones = 0 ; iteraciones<invAssLineCount2; iteraciones++){

                                    var masterT = assamblyload.getSublistValue({
                                        sublistId: 'billofmaterials',
                                        fieldId: 'masterdefault',
                                        line: iteraciones
                                    });

                                    if(masterT == true){
                                        log.audit({title:'masterT',details:masterT});
                                        listaensa.push(assamblyload.getSublistValue({
                                            sublistId: 'billofmaterials',
                                            fieldId: 'billofmaterials',
                                            line: iteraciones
                                        })) ;
                                    }
                                }
                                log.audit({title:'listaensa',details:listaensa});
                                var bomSearchObj = search.create({
                                    type: "bom",
                                    filters:
                                        [
                                            ["internalid","anyof",listaensa[0]]
                                        ],
                                    columns:
                                        [
                                            search.createColumn({name: "name", label: "Name"}),
                                            search.createColumn({name: "revisionname", label: "Revision : Name"}),
                                            search.createColumn({
                                                name: "internalid",
                                                sort: search.Sort.ASC,
                                                label: "Internal ID"
                                            }),
                                            search.createColumn({
                                                name: "internalid",
                                                join: "revision",
                                                label: "Internal ID"
                                            })
                                        ]
                                });
                                var revisionID;
                                bomSearchObj.run().each(function(result){
                                    revisionID = result.getValue({name:'internalid',join:'revision'})
                                    return true;
                                });
                                var assamblyload = record.load({
                                    type: 'bomrevision',
                                    id: revisionID,
                                    isDynamic: true,
                                });
                                var invAssLineCount2 = assamblyload.getLineCount({
                                    sublistId: 'component'
                                });
                                log.audit({title:'invAssLineCount2',details:invAssLineCount2});
                                var QuantAssembly = [];
                                var PriceAssembly = [];
                                var ItemsAssembly = [];
                                for( var iteraciones3 = 0 ; iteraciones3 < invAssLineCount2; iteraciones3++){
                                    var Iditem1 = assamblyload.getSublistValue({
                                        sublistId: 'component',
                                        fieldId: 'item',
                                        line: iteraciones3
                                    });
                                    ItemsAssembly.push(Iditem1)
                                    QuantAssembly.push(assamblyload.getSublistValue({
                                        sublistId: 'component',
                                        fieldId: 'quantity',
                                        line: iteraciones3
                                    }))
                                    var tipoSID;
                                    var itemSearchObj = search.create({
                                        type: "item",
                                        filters:
                                            [
                                                ["internalid","anyof",Iditem1]
                                            ],
                                        columns:
                                            [
                                                search.createColumn({name: "type", label: "Type"})
                                            ]
                                    });
                                    itemSearchObj.run().each(function(result){
                                        tipoSID = result.getValue({name: "type"})
                                        return true;
                                    });
                                    var CONST_ITEMTYPE = {
                                        'Assembly' : 'assemblyitem',
                                        'Description' : 'descriptionitem',
                                        'Discount' : 'discountitem',
                                        'GiftCert' : 'giftcertificateitem',
                                        'InvtPart' : 'inventoryitem',
                                        'Group' : 'itemgroup',
                                        'Kit' : 'kititem',
                                        'Markup' : 'markupitem',
                                        'NonInvtPart' : 'noninventoryitem',
                                        'OthCharge' : 'otherchargeitem',
                                        'Payment' : 'paymentitem',
                                        'Service' : 'serviceitem',
                                        'Subtotal' : 'subtotalitem'

                                    };
                                    var equivalencia;
                                    for (const key in CONST_ITEMTYPE) {
                                        if (key == tipoSID){
                                            equivalencia = CONST_ITEMTYPE[key];
                                            log.debug({title: 'SE ENCONTRO EQUIVALENCIA ', details: equivalencia});

                                        }
                                    }
                                    var loaditem1 = record.load({
                                        type: equivalencia,
                                        id: Iditem1,
                                        isDynamic: true,
                                    })
                                    var lasp = loaditem1.getValue({fieldId: 'lastpurchaseprice'}) ;
                                    PriceAssembly.push(lasp)

                                }
                                log.audit({title:'ItemsAssembly.tienePedimento',details:QuantAssembly});
                                log.audit({title:'QuantAssembly.tienePedimento',details:QuantAssembly});
                                log.audit({title:'ItemsAssembly<<<<<<',details:ItemsAssembly});
                                for(var iteracion4 =0 ;iteracion4< ItemsAssembly.length;iteracion4++){
                                    log.audit({title:'iteracion4<<<<<<',details:iteracion4});
                                    var pedi1 = record_now.getSublistValue({
                                        sublistId: sublista,
                                        fieldId: 'custcol_efx_ped_numero_pedimento',
                                        line: i
                                    }) || '';
                                    var item1 = ItemsAssembly[iteracion4];
                                    log.audit({title:'ItemsAssembly[iteracion4]<<<<<<',details:ItemsAssembly[iteracion4]});
                                    var cantidad1 = QuantAssembly[iteracion4] * tipoQItem;
                                    var costo1 = PriceAssembly[iteracion4];
                                    var total1 = parseFloat(costo1) * parseFloat(cantidad1);

                                    if(!cantidad1){cantidad1=0}
                                    if(!costo1){costo1=0}
                                    if(!total1){total1=0}

                                    if (pedi1) {
                                        log.audit({title:'pedimentoObj<<<<<<',details:pedimentoObj});
                                        array_pedimentoObj.push({pedimento: pedi1, item: item1,cantidad: cantidad1 , costo: costo1,total: total1 });
                                        log.audit({title: 'array_pedimentoObj 195', details: array_pedimentoObj });
                                    }

                                }


                            }else{
                                pedimentoObj.pedimento = record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: 'custcol_efx_ped_numero_pedimento',
                                    line: i
                                }) || '';
                                pedimentoObj.item = record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: 'item',
                                    line: i
                                }) || '';
                                pedimentoObj.cantidad = parseFloat(record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: campo_cantidad,
                                    line: i
                                })) || '';
                                pedimentoObj.costo = parseFloat(record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: campo_rate,
                                    line: i
                                })) || '';
                                pedimentoObj.total = parseFloat(pedimentoObj.costo) * parseFloat(pedimentoObj.cantidad);
                                pedimentoObj.ubicacion = ubicacionLinea;
                                log.audit({title: 'pedimentoObj.pedimento', details: pedimentoObj.pedimento});
                                if (pedimentoObj.pedimento) {
                                    array_pedimentoObj.push(pedimentoObj);
                                }
                            }


                        }
                    }

                    log.audit({title:'array_pedimentoObj 233',details:array_pedimentoObj});
                    var filtros_pedimento = new Array();
                    for(var i=0;i<array_pedimentoObj.length;i++){
                        var filtro = [['custrecord_efx_ped_numpedimento',search.Operator.IS,array_pedimentoObj[i].pedimento],'AND',['custrecord_efx_ped_h_item',search.Operator.ANYOF,array_pedimentoObj[i].item],'AND',['custrecord_efx_ped_h_location',search.Operator.ANYOF,array_pedimentoObj[i].ubicacion]];
                        filtros_pedimento.push(filtro);
                        var conteo=i+1;
                        if(conteo<array_pedimentoObj.length){
                            filtros_pedimento.push('OR');
                        }
                    }

                    log.audit({title:'filtros_pedimento',details:filtros_pedimento});
                    var buscaPed = search.create({
                        type:'customrecord_efx_ped_record_history',
                        filters: [
                            ['isinactive',search.Operator.IS,'F']
                            ,'AND',
                            ['custrecord_efx_ped_related_tran',search.Operator.IS,record_now.id]
                            ,'AND',
                            filtros_pedimento
                        ],
                        columns:[
                            search.createColumn({name:'created',sort: search.Sort.DESC}),
                            search.createColumn({name:'custrecord_efx_ped_related_tran'}),
                            search.createColumn({name:'custrecord_efx_ped_h_item'}),
                            search.createColumn({name:'custrecord_efx_ped_h_quantity'}),
                            search.createColumn({name:'custrecord_efx_ped_numpedimento'}),
                            search.createColumn({name:'custrecord_efx_ped_h_pedimento'}),
                            search.createColumn({name:'custrecord_efx_ped_h_location'}),
                            search.createColumn({name:'internalid'}),
                        ],
                    });

                    log.audit({title:'buscaPed',details:buscaPed});
                    var ejecutar_pedimento = buscaPed.run();
                    log.audit({title:'ejecutar_pedimento',details:ejecutar_pedimento});
                    var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);
                    log.audit({title:'resultado_pedimento',details:resultado_pedimento});
                    log.audit({title:'resultado_pedimento',details:resultado_pedimento.length});

                    for (var y = 0; y < array_pedimentoObj.length; y++) {
                        for(var p=0;p<resultado_pedimento.length;p++) {
                            var transaccion_busca = resultado_pedimento[p].getValue({name: 'custrecord_efx_ped_related_tran'}) || '';
                            var item_busca = resultado_pedimento[p].getValue({name: 'custrecord_efx_ped_h_item'}) || '';
                            var cantidad_busca = parseFloat(resultado_pedimento[p].getValue({name: 'custrecord_efx_ped_h_quantity'})) || '';
                            var pedimento_busca = resultado_pedimento[p].getValue({name: 'custrecord_efx_ped_numpedimento'}) || '';
                            var pedimentoid_busca = resultado_pedimento[p].getValue({name: 'custrecord_efx_ped_h_pedimento'}) || '';
                            var historicoid_busca = resultado_pedimento[p].getValue({name: 'internalid'}) || '';
                            var ubicacion_busca = resultado_pedimento[p].getValue({name: 'custrecord_efx_ped_h_location'}) || '';
                            var elimina_existe = '';

                            if (pedimento_busca == array_pedimentoObj[y].pedimento && item_busca == array_pedimentoObj[y].item && ubicacion_busca == array_pedimentoObj[y].ubicacion) {

                                log.audit({title: 'cantidad_busca', details: cantidad_busca});
                                log.audit({
                                    title: 'array_pedimentoObj[y].cantidad286',
                                    details: array_pedimentoObj[y].cantidad
                                });

                                if (cantidad_busca < array_pedimentoObj[y].cantidad) {
                                    var cantidad_nueva = array_pedimentoObj[y].cantidad - cantidad_busca;
                                    consultaPedimentos(cantidad_nueva, pedimentoid_busca)

                                }
                                if(cantidad_busca > array_pedimentoObj[y].cantidad) {
                                    var cantidad_nueva = cantidad_busca - array_pedimentoObj[y].cantidad;
                                    cantidad_nueva = cantidad_nueva * (-1);
                                    consultaPedimentos(cantidad_nueva, pedimentoid_busca)
                                    //resta

                                }
                                break;
                            }
                        }
                    }

                }

                if (scriptContext.type == scriptContext.UserEventType.CREATE) {

                    var record_now = scriptContext.newRecord;
                    var recType = record_now.type;
                    log.audit({title: '', details: ''});

                    var sublista = '';
                    var campo_rate = '';
                    var campo_cantidad = '';

                    if(recType==record.Type.ITEM_RECEIPT){
                        sublista = 'item';
                        campo_cantidad = 'quantity';
                        campo_rate = 'rate';

                        //log.audit({title: 'record_now', details: record_now});
                        //Guardar log en archivo de texto para verlo todo
                        /* var fileObj = file.create({
                            name    : 'testlog.txt',
                            fileType: file.Type.PLAINTEXT,
                            contents: JSON.stringify(record_now)
                        });
                        fileObj.folder = '-15';
                        var fileId = fileObj.save(); */
                        //Ver si este receipt proviende de un inboundshipment
                        var inb_ship_origen = record_now.getValue('inboundshipmentvalue');
                        var contiene_ped = record_now.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_efx_ped_contains',
                            line: 0
                        });
                        log.audit({title: 'Valores inicio', details: {inb_ship_origen: inb_ship_origen, contiene_ped: contiene_ped}});
                        //If checkbox contiene pedimentos is true
                        if(contiene_ped){
                            //Get the pedimento number
                            var no_pedimento = record_now.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_efx_ped_numero_pedimento',
                                line: 0
                            });
                            //Remove spaces
                            var ped_sin_esp = no_pedimento.replace(/\s/g, '');
                            //Get aduana id
                            var adua_ped = ped_sin_esp.substring(2,4);
                            //Set recibido por aduana field to this id (custbody_efx_ped_rec_aduana)
                            record_now.setValue('custbody_efx_ped_rec_aduana', adua_ped);
                        }

                        //Recuperar el pedimento especificado en el campo de  custrecord_efx_ped_inb_clavesat por medio
                        // de una busqueda

                        //Si este receipt proviene de un inbound shipment entonces hacer la busqueda
                        if(inb_ship_origen){
                            var inboundshipmentSearchObj = search.create({
                                type: "inboundshipment",
                                filters:
                                    [
                                        ["internalid","anyof",inb_ship_origen]
                                    ],
                                columns:
                                    [
                                        search.createColumn({name: "custrecord_efx_ped_inb_clavesat", label: "Clave SAT"}),
                                        search.createColumn({name: "custrecord_efx_ped_inb_aduana", label: "Aduana"})
                                    ]
                            });

                            var searchResultCount = inboundshipmentSearchObj.runPaged().count;
                            log.debug("inboundshipmentSearchObj result count",searchResultCount);
                            inboundshipmentSearchObj.run().each(function(result){
                                // .run().each has a limit of 4,000 results
                                payl_noPedimento = result.getValue('custrecord_efx_ped_inb_clavesat');
                                payl_Aduana = result.getValue('custrecord_efx_ped_inb_aduana');
                                log.audit({title: 'Pedimento tomado del inbound shipment: ' + payl_noPedimento, details: ''});
                                log.audit({title: 'Aduana tomada del inbound shipment: ' + payl_Aduana, details: ''});
                                return true;
                            });

                            //Si se encuentra el valor de la aduana en el inbound shipment... (Siempre deberia existir el
                            // valor)
                            if(payl_Aduana){
                                //Inyectar el nombre de la aduana en main body custom field
                                record_now.setValue('custbody_efx_ped_rec_aduana', payl_Aduana);
                            }else {
                                log.audit({title: 'No se encuentra la aduana en el inboundshipment ', details: ''});
                            }

                            //Inyectar valor de pedimentos a todos los items y marcar la casilla si es que trae pedimentos

                            if(payl_noPedimento){
                                //Contar cuantas lineas traeria la sublista de este recibo
                                var noLinRecNvo = record_now.getLineCount({
                                    sublistId:	   'item'
                                });

                                log.audit({title: 'SE VA A CREAR UN ITEM RECEIPT con este numero de lineas: ' + noLinRecNvo, details: ''});

                                //Por ej, considerando 3 lineas, habria que iterar cada una, marcar la casilla de pedimento
                                // y agregar el numero de pedimento
                                //Recorrer los articulos del receipt y ponerles el pedimento
                                for(i=0;i<noLinRecNvo;i++){
                                    var itemId = record_now.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        line: i
                                    });
                                    var needPedim = search.lookupFields({
                                       type: search.Type.ITEM,
                                       id: itemId,
                                       columns: ['custitem_efx_ped_contains']
                                    });
                                    log.debug({title:'needPedim', details:needPedim});
                                    if (needPedim.custitem_efx_ped_contains) {
                                        record_now.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'custcol_efx_ped_numero_pedimento',
                                            line: i,
                                            value: payl_noPedimento
                                        });
                                        record_now.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'custcol_efx_ped_contains',
                                            line: i,
                                            value: true
                                        });
                                    }
                                }

                            }



                        }

                        //Populate "RECIBIDO POR ADUANA" field with the aduana IO


                    }


                }
            }catch (e) {
                log.audit({title: 'error', details: e});
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
            if (scriptContext.type == scriptContext.UserEventType.CREATE) {
                var record_now = scriptContext.newRecord;
                var recType = record_now.type;

                var sublista = '';
                var campo_rate = '';
                var campo_cantidad = '';

                if(recType==record.Type.CREDIT_MEMO){
                    sublista = 'item';
                    campo_cantidad = 'quantity';
                    campo_rate = 'rate';
                }
                if(recType==record.Type.ITEM_RECEIPT){
                    sublista = 'item';
                    campo_cantidad = 'quantity';
                    campo_rate = 'rate';
                }
                if(recType==record.Type.INVENTORY_ADJUSTMENT){
                    sublista = 'inventory';
                    campo_cantidad = 'adjustqtyby';
                    campo_rate = 'unitcost';
                }

                var dataValidate = false;

                if (recType==record.Type.ITEM_RECEIPT) {
                    var inbShip = record_now.getValue({fieldId: 'inboundshipmentvalue'});
                    log.debug({title:'inbShip', details:inbShip});
                    if (inbShip) {
                        // var dataPed = validatePedimento(inbShip);
                    }
                }

                if (dataValidate == false) {
                    var conteoLine = record_now.getLineCount({sublistId:sublista});
                    log.audit({title: 'conteoLine-transType', details:{conteoLine: conteoLine, recType: recType}})
    
                    var array_pedimentoObj =[];
                    for(var i=0;i<conteoLine;i++){
                        var pedimentoObj={
                            pedimento:'',
                            item:'',
                            cantidad:'',
                            costo:'',
                            total:'',
                            tienePedimento:'',
                            ubicacion:''
                        }
    
    
                        pedimentoObj.tienePedimento = record_now.getSublistValue({sublistId: sublista,fieldId: 'custcol_efx_ped_contains',line:i}) || '';
                        log.audit({title:'pedimentoObj.tienePedimento',details:pedimentoObj.tienePedimento});
                        var tipoItem = record_now.getSublistValue({sublistId: sublista,fieldId: 'itemtype',line:i}) || '';
                        var tipoQItem = record_now.getSublistValue({sublistId: sublista,fieldId: 'quantity',line:i}) || '';
                        var ubicacionLinea = record_now.getSublistValue({sublistId: sublista,fieldId: 'location',line:i}) || '';
                        var listaensa = [];
    
                        log.audit({title:'tipoItem',details:tipoItem});
                        if(pedimentoObj.tienePedimento) {
                            var ItemIdAssembly = record_now.getSublistValue({
                                sublistId: sublista,
                                fieldId: 'item',
                                line: i
                            }) || '';
                            log.audit({title:'ItemIdAssembly',details:ItemIdAssembly});
                            if(tipoItem=='Assembly'){
                                var assamblyload = record.load({
                                    type: 'assemblyitem',
                                    id: ItemIdAssembly,
                                    isDynamic: true,
                                });
    
                                var invAssLineCount2 = assamblyload.getLineCount({
                                    sublistId: 'billofmaterials'
                                });
    
                                log.audit({title:'invAssLineCount2',details:invAssLineCount2});
                                for(var iteraciones = 0 ; iteraciones<invAssLineCount2; iteraciones++){
    
                                    var masterT = assamblyload.getSublistValue({
                                        sublistId: 'billofmaterials',
                                        fieldId: 'masterdefault',
                                        line: iteraciones
                                    });
    
                                    if(masterT == true){
                                        log.audit({title:'masterT',details:masterT});
                                        listaensa.push(assamblyload.getSublistValue({
                                            sublistId: 'billofmaterials',
                                            fieldId: 'billofmaterials',
                                            line: iteraciones
                                        })) ;
                                    }
                                }
                                log.audit({title:'listaensa',details:listaensa});
                                var bomSearchObj = search.create({
                                    type: "bom",
                                    filters:
                                        [
                                            ["internalid","anyof",listaensa[0]]
                                        ],
                                    columns:
                                        [
                                            search.createColumn({name: "name", label: "Name"}),
                                            search.createColumn({name: "revisionname", label: "Revision : Name"}),
                                            search.createColumn({
                                                name: "internalid",
                                                sort: search.Sort.ASC,
                                                label: "Internal ID"
                                            }),
                                            search.createColumn({
                                                name: "internalid",
                                                join: "revision",
                                                label: "Internal ID"
                                            })
                                        ]
                                });
                                var revisionID;
                                bomSearchObj.run().each(function(result){
                                    revisionID = result.getValue({name:'internalid',join:'revision'})
                                    return true;
                                });
                                var assamblyload = record.load({
                                    type: 'bomrevision',
                                    id: revisionID,
                                    isDynamic: true,
                                });
                                var invAssLineCount2 = assamblyload.getLineCount({
                                    sublistId: 'component'
                                });
                                log.audit({title:'invAssLineCount2',details:invAssLineCount2});
    
                                var QuantAssembly = [];
                                var PriceAssembly = [];
                                var ItemsAssembly = [];
                                for( var iteraciones3 = 0 ; iteraciones3 < invAssLineCount2; iteraciones3++){
                                    var Iditem1 = assamblyload.getSublistValue({
                                        sublistId: 'component',
                                        fieldId: 'item',
                                        line: iteraciones3
                                    });
                                    ItemsAssembly.push(Iditem1)
                                    QuantAssembly.push(assamblyload.getSublistValue({
                                        sublistId: 'component',
                                        fieldId: 'quantity',
                                        line: iteraciones3
                                    }))
                                    var tipoSID;
                                    var itemSearchObj = search.create({
                                        type: "item",
                                        filters:
                                            [
                                                ["internalid","anyof",Iditem1]
                                            ],
                                        columns:
                                            [
                                                search.createColumn({name: "type", label: "Type"})
                                            ]
                                    });
                                    itemSearchObj.run().each(function(result){
                                        tipoSID = result.getValue({name: "type"})
                                        return true;
                                    });
                                    log.debug({title: 'tipoSID ', details: tipoSID});
                                    var CONST_ITEMTYPE = {
                                        'Assembly' : 'assemblyitem',
                                        'Description' : 'descriptionitem',
                                        'Discount' : 'discountitem',
                                        'GiftCert' : 'giftcertificateitem',
                                        'InvtPart' : 'inventoryitem',
                                        'Group' : 'itemgroup',
                                        'Kit' : 'kititem',
                                        'Markup' : 'markupitem',
                                        'NonInvtPart' : 'noninventoryitem',
                                        'OthCharge' : 'otherchargeitem',
                                        'Payment' : 'paymentitem',
                                        'Service' : 'serviceitem',
                                        'Subtotal' : 'subtotalitem'
    
                                    };
                                    var equivalencia;
                                    for (const key in CONST_ITEMTYPE) {
                                        if (key == tipoSID){
                                            equivalencia = CONST_ITEMTYPE[key];
                                            log.debug({title: 'SE ENCONTRO EQUIVALENCIA ', details: equivalencia});
    
                                        }
                                    }
                                    log.debug({title: 'equivalencia ', details: equivalencia});
                                    var loaditem1 = record.load({
                                        type: equivalencia,
                                        id: Iditem1,
                                        isDynamic: true,
                                    })
    
                                    PriceAssembly.push( loaditem1.getValue({fieldId: 'lastpurchaseprice'}) )
                                    log.debug({title: 'loaditem1.getValue({fieldId: lastpurchaseprice})  ', details: loaditem1.getValue({fieldId: 'lastpurchaseprice'}) });
                                }
                                log.audit({title:'ItemsAssembly<<<<<<',details:ItemsAssembly});
                                for(var iteracion4 =0 ;iteracion4< ItemsAssembly.length;iteracion4++){
                                    log.audit({title:'iteracion4<<<<<<',details:iteracion4});
                                    var pedi1 = record_now.getSublistValue({
                                        sublistId: sublista,
                                        fieldId: 'custcol_efx_ped_numero_pedimento',
                                        line: i
                                    }) || '';
                                    var item1 = ItemsAssembly[iteracion4];
                                    log.audit({title:'ItemsAssembly[iteracion4]<<<<<<',details:ItemsAssembly[iteracion4]});
                                    var cantidad1 = QuantAssembly[iteracion4] * tipoQItem;
                                    var costo1 = PriceAssembly[iteracion4];
                                    var total1 = parseFloat(costo1) * parseFloat(cantidad1);
                                    if(!cantidad1){cantidad1=0}
                                    if(!costo1){costo1=0}
                                    if(!total1){total1=0}
                                    if (pedi1) {
                                        log.audit({title:'pedimentoObj<<<<<<',details:pedimentoObj});
                                        array_pedimentoObj.push({pedimento: pedi1, item: item1,cantidad: cantidad1 , costo: costo1,total: total1 });
                                        log.audit({title: 'array_pedimentoObj 195', details: array_pedimentoObj });
                                    }
    
                                }
    
    
                            }else{
                                pedimentoObj.pedimento = record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: 'custcol_efx_ped_numero_pedimento',
                                    line: i
                                }) || '';
                                pedimentoObj.item = record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: 'item',
                                    line: i
                                }) || '';
                                pedimentoObj.cantidad = parseFloat(record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: campo_cantidad,
                                    line: i
                                })) || '';
                                pedimentoObj.costo = parseFloat(record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: campo_rate,
                                    line: i
                                })) || '';
                                pedimentoObj.ubicacion = record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: 'location',
                                    line: i
                                }) || '';
                                pedimentoObj.total = parseFloat(pedimentoObj.costo) * parseFloat(pedimentoObj.cantidad);
                                log.audit({title: 'pedimentoObj.pedimento', details: pedimentoObj.pedimento});
                                if (pedimentoObj.pedimento) {
                                    array_pedimentoObj.push(pedimentoObj);
                                }
                            }
    
    
                        }
                    }
                    //array_pedimentoObj es un array de objetos que trae un objeto por linea del nuevo record
                    //lo de abajo crea un filtro donde en el record de historial coincidan los campos:
                    //transaccion relacionada (transaccion de origen), articulo y numero de pedimento
                    log.audit({title:'array_pedimentoObj 852',details:array_pedimentoObj});
                    var filtros_pedimento = new Array();
                    var filtros_pedimento_extra = new Array();
                    filtros_pedimento.push(['isinactive',search.Operator.IS,'F']);
                    filtros_pedimento.push('AND');
                    filtros_pedimento.push(['custrecord_efx_ped_related_tran',search.Operator.IS,record_now.id]);
                    
                    for(var i=0;i<array_pedimentoObj.length;i++){
                        var filtro = [['custrecord_efx_ped_numpedimento',search.Operator.IS,array_pedimentoObj[i].pedimento],'AND',['custrecord_efx_ped_h_item',search.Operator.ANYOF,array_pedimentoObj[i].item],'AND',['custrecord_efx_ped_h_location',search.Operator.ANYOF,array_pedimentoObj[i].ubicacion]];
                        filtros_pedimento_extra.push(filtro);
                        var conteo=i+1;
                        if(conteo<array_pedimentoObj.length){
                            filtros_pedimento_extra.push('OR');
                        }
                    }
                    if(filtros_pedimento_extra.length >0){
                        filtros_pedimento.push('AND');
                        filtros_pedimento.push(filtros_pedimento_extra);
                    }
    
                    log.audit({title:'filtros_pedimento',details:filtros_pedimento});
                    var buscaPed = search.create({
                        type:'customrecord_efx_ped_record_history',
                        filters: [
                            ['isinactive',search.Operator.IS,'F']
                            ,'AND',
                            ['custrecord_efx_ped_related_tran',search.Operator.IS,record_now.id]
                            ,'AND',
                            filtros_pedimento
                        ],
                        columns:[
                            search.createColumn({name:'created',sort: search.Sort.DESC}),
                            search.createColumn({name:'custrecord_efx_ped_related_tran'}),
                            search.createColumn({name:'custrecord_efx_ped_h_item'}),
                            search.createColumn({name:'custrecord_efx_ped_h_quantity'}),
                            search.createColumn({name:'custrecord_efx_ped_numpedimento'}),
                            search.createColumn({name:'custrecord_efx_ped_h_pedimento'}),
                            search.createColumn({name:'custrecord_efx_ped_h_location'}),
                            search.createColumn({name:'internalid'}),
                        ],
                    });
    
                    log.audit({title:'buscaPed',details:buscaPed});
                    var ejecutar_pedimento = buscaPed.run();
                    log.audit({title:'ejecutar_pedimento',details:ejecutar_pedimento});
                    var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);
                    log.audit({title:'resultado_pedimento',details:resultado_pedimento});
                    log.audit({title:'resultado_pedimento',details:resultado_pedimento.length});
                    //Toma el primer resultado de la busqueda y recorre el array que trae los records de la sublista del
                    // nuevo record, en el que coincida checa si la cantidad que tenemos en el historico es menor a la
                    // cantidad que trae el record recien insertado
                    for(var p=0;p<resultado_pedimento.length;p++){
                        var transaccion_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_related_tran'}) || '';
                        var item_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_h_item'}) || '';
                        var cantidad_busca = parseFloat(resultado_pedimento[p].getValue({name:'custrecord_efx_ped_h_quantity'})) || '';
                        var pedimento_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_numpedimento'}) || '';
                        var pedimentoid_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_h_pedimento'}) || '';
                        var ubicacion_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_h_location'}) || '';
                        var historicoid_busca = resultado_pedimento[p].getValue({name:'internalid'}) || '';
                        var elimina_existe = '';
                        for(var y=0;y<array_pedimentoObj.length;y++){
                            if(pedimento_busca==array_pedimentoObj[y].pedimento && item_busca==array_pedimentoObj[y].item && ubicacion_busca==array_pedimentoObj[y].ubicacion){
    
                                log.audit({title:'cantidad_busca',details:cantidad_busca});
                                log.audit({title:'array_pedimentoObj[y].cantidad905',details:array_pedimentoObj[y].cantidad});
                                log.audit({title:'total_costo_ped_suma',details:total_costo_ped});
                                var operacion = '';
                                if(recType==record.Type.INVENTORY_ADJUSTMENT){
                                    if(array_pedimentoObj[y].cantidad<0){
    
                                    }
                                }
                                //Si la cantidad en el historial para esta combinacion de trasaccion
                                // relacionada(transaccion origen), articulo y numero de pedimento es menor a la
                                // cantidad que se inserto en el nuevo record
                                if(cantidad_busca < array_pedimentoObj[y].cantidad){
                                    //la cantidad nueva seria la resta de la cantidad insertada en el nuevo rec. - la
                                    // cantidad existente en la linea del historico para esta combinacion de de trasaccion
                                    // relacionada(transaccion origen), articulo y numero de pedimento
                                    var cantidad_nueva = array_pedimentoObj[y].cantidad - cantidad_busca;
                                    //El costo nuevo seria la multiplicacion del costo unitario que trae la linea de
                                    // la sublista del record nuevo multiplicada por la cantidad nueva de piezas
                                    var total_costo_ped = parseFloat(cantidad_nueva) * parseFloat(array_pedimentoObj[y].costo);
                                    log.audit({title:'cantidad_nueva_suma',details:cantidad_nueva});
                                    var old_value = actualizaPedimento(cantidad_nueva, total_costo_ped, pedimentoid_busca, 'T');
                                    log.audit({title: 'transaccion_busca', details: transaccion_busca});
                                    log.audit({title: 'array_pedimentoObj[y]927', details: array_pedimentoObj[y]});
                                    log.audit({title: 'pedimentoid_busca', details: pedimentoid_busca});
                                    log.audit({title: 'old_value', details: old_value});
                                    historicoPedimento(transaccion_busca, array_pedimentoObj[y], pedimentoid_busca, old_value, cantidad_nueva);
                                    elimina_existe = y;
                                    //suma
                                }
                                if(cantidad_busca > array_pedimentoObj[y].cantidad){
                                    //resta
                                    var cantidad_nueva = cantidad_busca - array_pedimentoObj[y].cantidad;
                                    cantidad_nueva = cantidad_nueva * (-1);
                                    log.audit({title:'cantidad_nueva_resta',details:cantidad_nueva});
                                    var total_costo_ped = parseFloat(cantidad_nueva) * parseFloat(array_pedimentoObj[y].costo);
                                    log.audit({title:'total_costo_ped_resta',details:total_costo_ped});
                                    var old_value = actualizaPedimento(cantidad_nueva, total_costo_ped, pedimentoid_busca, 'T');
                                    log.audit({title: 'transaccion_busca', details: transaccion_busca});
                                    log.audit({title: 'array_pedimentoObj[y]943', details: array_pedimentoObj[y]});
                                    log.audit({title: 'pedimentoid_busca', details: pedimentoid_busca});
                                    log.audit({title: 'old_value', details: old_value});
                                    historicoPedimento(transaccion_busca, array_pedimentoObj[y], pedimentoid_busca, old_value, cantidad_nueva);
                                    elimina_existe = y;
    
                                }
                                elimina_existe = y;
                            }
    
                            //ver si ponemos otra condicion para demas transacciones
                            if(array_pedimentoObj[y].cantidad<0){
                                elimina_existe = y;
                            }
                        }
                        log.audit({title:'elimina_existe',details:elimina_existe});
    
                        if(elimina_existe !== '' && elimina_existe >= 0){
                            log.audit({title:'elimina_existe',details:elimina_existe});
                            array_pedimentoObj.splice(elimina_existe,1);
                            log.audit({title:'array_pedimentoObj 963',details:array_pedimentoObj});
                        }
                    }
                    log.audit({title:'array_pedimentoObj 966',details:array_pedimentoObj});
    
    
                    //crear nuevos en edicion
    
                    if(array_pedimentoObj.length>0) {
    
                        var conteoLine = record_now.getLineCount({sublistId: sublista});
                        var array_pedimentos = new Array();
                        var pedimentos_existentes = new Array();
    
                        var pedimentos_linea = new Array();
                        pedimentos_linea = array_pedimentoObj;
                        array_pedimentos = array_pedimentoObj;
    
                        // if (pedimentos_linea.length > 0) {
                        //     pedimentos_existentes = buscaPedimentos(pedimentos_linea);
                        //     log.audit({title: 'pedimentos_existentes', details: pedimentos_existentes});
                        // }
    
                        for (var x = 0; x < array_pedimentos.length; x++) {
                            var ped_master_record = record.create({
                                type: 'customrecord_efx_ped_master_record',
                            });
                            ped_master_record.setValue({
                                fieldId: 'custrecord_efx_ped_number',
                                value: array_pedimentos[x].pedimento
                            });
                            ped_master_record.setValue({
                                fieldId: 'custrecord_efx_ped_date',
                                value: record_now.getValue({fieldId: 'trandate'})
                            });
                            ped_master_record.setValue({
                                fieldId: 'custrecord_exf_ped_location',
                                value: ubicacionLinea
                            });
                            ped_master_record.setValue({
                                fieldId: 'custrecord_exf_ped_item',
                                value: array_pedimentos[x].item
                            });
                            ped_master_record.setValue({
                                fieldId: 'custrecord_efx_ped_available',
                                value: array_pedimentos[x].cantidad
                            });
                            ped_master_record.setValue({
                                fieldId: 'custrecord_efx_ped_exchange',
                                value: record_now.getValue({fieldId: 'exchangerate'})
                            });
                            ped_master_record.setValue({fieldId: 'custrecord_efx_ped_adnumber', value: 'numeroAduana'});
                            ped_master_record.setValue({fieldId: 'custrecord_efx_ped_adname', value: 'NombreAduana'});
                            ped_master_record.setValue({
                                fieldId: 'custrecord_efx_ped_price',
                                value: array_pedimentos[x].costo
                            });
                            ped_master_record.setValue({
                                fieldId: 'custrecord_efx_ped_eta',
                                value: record_now.getValue({fieldId: 'trandate'})
                            });
                            ped_master_record.setValue({
                                fieldId: 'custrecord_efx_ped_etd',
                                value: record_now.getValue({fieldId: 'trandate'})
                            });
                            ped_master_record.setValue({
                                fieldId: 'custrecord_efx_ped_total',
                                value: array_pedimentos[x].total
                            });
                            var pedimento_id = ped_master_record.save();
                            log.audit({title: 'pedimento_id 1273', details: pedimento_id});
    
                            var ped_history = record.create({
                                type: 'customrecord_efx_ped_record_history'
                            });
                            ped_history.setValue({fieldId: 'custrecord_efx_ped_related_tran', value: record_now.id});
                            if(ubicacionLinea){
                                ped_history.setValue({fieldId: 'custrecord_efx_ped_h_location', value: ubicacionLinea});
                            }
                            ped_history.setValue({fieldId: 'custrecord_efx_ped_h_item', value: array_pedimentos[x].item});
                            ped_history.setValue({
                                fieldId: 'custrecord_efx_ped_h_quantity',
                                value: array_pedimentos[x].cantidad
                            });
                            ped_history.setValue({fieldId: 'custrecord_efx_ped_h_oldvalue', value: old_value});
                            ped_history.setValue({
                                fieldId: 'custrecord_efx_ped_newvalue',
                                value: array_pedimentos[x].cantidad
                            });
                            ped_history.setValue({fieldId: 'custrecord_efx_ped_h_pedimento', value: pedimento_id});
                            ped_history.setValue({
                                fieldId: 'custrecord_efx_ped_numpedimento',
                                value: array_pedimentos[x].pedimento
                            });
                            ped_history.save();
                        }
    
                    }
                }
                // if (dataValidate == true) {
                    
                // }

            }

            if (scriptContext.type == scriptContext.UserEventType.EDIT) {
                var record_now = scriptContext.newRecord;
                var recType = record_now.type;

                var sublista = '';
                var campo_rate = '';
                var campo_cantidad = '';

                if(recType==record.Type.CREDIT_MEMO){
                    sublista = 'item';
                    campo_cantidad = 'quantity';
                    campo_rate = 'rate';
                }
                if(recType==record.Type.ITEM_RECEIPT){
                    sublista = 'item';
                    campo_cantidad = 'quantity';
                    campo_rate = 'rate';
                }
                if(recType==record.Type.INVENTORY_ADJUSTMENT){
                    sublista = 'inventory';
                    campo_cantidad = 'adjustqtyby';
                    campo_rate = 'unitcost';
                }

                var conteoLine = record_now.getLineCount({sublistId:sublista});
                log.audit({title: 'conteoLine', details:conteoLine})

                var array_pedimentoObj =[];
                for(var i=0;i<conteoLine;i++){
                    var pedimentoObj={
                        pedimento:'',
                        item:'',
                        cantidad:'',
                        costo:'',
                        total:'',
                        tienePedimento:''
                    }


                    pedimentoObj.tienePedimento = record_now.getSublistValue({sublistId: sublista,fieldId: 'custcol_efx_ped_contains',line:i}) || '';
                    log.audit({title:'pedimentoObj.tienePedimento',details:pedimentoObj.tienePedimento});
                    var tipoItem = record_now.getSublistValue({sublistId: sublista,fieldId: 'itemtype',line:i}) || '';
                    var tipoQItem = record_now.getSublistValue({sublistId: sublista,fieldId: 'quantity',line:i}) || '';
                    var ubicacionLinea = record_now.getSublistValue({sublistId: sublista,fieldId: 'location',line:i}) || '';
                    var listaensa = [];

                    log.audit({title:'tipoItem',details:tipoItem});
                    if(pedimentoObj.tienePedimento) {
                        var ItemIdAssembly = record_now.getSublistValue({
                            sublistId: sublista,
                            fieldId: 'item',
                            line: i
                        }) || '';
                        log.audit({title:'ItemIdAssembly',details:ItemIdAssembly});
                        if(tipoItem=='Assembly'){
                            var assamblyload = record.load({
                                type: 'assemblyitem',
                                id: ItemIdAssembly,
                                isDynamic: true,
                            });

                            var invAssLineCount2 = assamblyload.getLineCount({
                                sublistId: 'billofmaterials'
                            });

                            log.audit({title:'invAssLineCount2',details:invAssLineCount2});
                            for(var iteraciones = 0 ; iteraciones<invAssLineCount2; iteraciones++){

                                var masterT = assamblyload.getSublistValue({
                                    sublistId: 'billofmaterials',
                                    fieldId: 'masterdefault',
                                    line: iteraciones
                                });

                                if(masterT == true){
                                    log.audit({title:'masterT',details:masterT});
                                    listaensa.push(assamblyload.getSublistValue({
                                        sublistId: 'billofmaterials',
                                        fieldId: 'billofmaterials',
                                        line: iteraciones
                                    })) ;
                                }
                            }
                            log.audit({title:'listaensa',details:listaensa});
                            var bomSearchObj = search.create({
                                type: "bom",
                                filters:
                                    [
                                        ["internalid","anyof",listaensa[0]]
                                    ],
                                columns:
                                    [
                                        search.createColumn({name: "name", label: "Name"}),
                                        search.createColumn({name: "revisionname", label: "Revision : Name"}),
                                        search.createColumn({
                                            name: "internalid",
                                            sort: search.Sort.ASC,
                                            label: "Internal ID"
                                        }),
                                        search.createColumn({
                                            name: "internalid",
                                            join: "revision",
                                            label: "Internal ID"
                                        })
                                    ]
                            });
                            var revisionID;
                            bomSearchObj.run().each(function(result){
                                revisionID = result.getValue({name:'internalid',join:'revision'})
                                return true;
                            });
                            var assamblyload = record.load({
                                type: 'bomrevision',
                                id: revisionID,
                                isDynamic: true,
                            });
                            var invAssLineCount2 = assamblyload.getLineCount({
                                sublistId: 'component'
                            });
                            log.audit({title:'invAssLineCount2',details:invAssLineCount2});

                            var QuantAssembly = [];
                            var PriceAssembly = [];
                            var ItemsAssembly = [];
                            for( var iteraciones3 = 0 ; iteraciones3 < invAssLineCount2; iteraciones3++){
                                var Iditem1 = assamblyload.getSublistValue({
                                    sublistId: 'component',
                                    fieldId: 'item',
                                    line: iteraciones3
                                });
                                ItemsAssembly.push(Iditem1)
                                QuantAssembly.push(assamblyload.getSublistValue({
                                    sublistId: 'component',
                                    fieldId: 'quantity',
                                    line: iteraciones3
                                }))
                                var tipoSID;
                                var itemSearchObj = search.create({
                                    type: "item",
                                    filters:
                                        [
                                            ["internalid","anyof",Iditem1]
                                        ],
                                    columns:
                                        [
                                            search.createColumn({name: "type", label: "Type"})
                                        ]
                                });
                                itemSearchObj.run().each(function(result){
                                    tipoSID = result.getValue({name: "type"})
                                    return true;
                                });
                                log.debug({title: 'tipoSID ', details: tipoSID});
                                var CONST_ITEMTYPE = {
                                    'Assembly' : 'assemblyitem',
                                    'Description' : 'descriptionitem',
                                    'Discount' : 'discountitem',
                                    'GiftCert' : 'giftcertificateitem',
                                    'InvtPart' : 'inventoryitem',
                                    'Group' : 'itemgroup',
                                    'Kit' : 'kititem',
                                    'Markup' : 'markupitem',
                                    'NonInvtPart' : 'noninventoryitem',
                                    'OthCharge' : 'otherchargeitem',
                                    'Payment' : 'paymentitem',
                                    'Service' : 'serviceitem',
                                    'Subtotal' : 'subtotalitem'

                                };
                                var equivalencia;
                                for (const key in CONST_ITEMTYPE) {
                                    if (key == tipoSID){
                                        equivalencia = CONST_ITEMTYPE[key];
                                        log.debug({title: 'SE ENCONTRO EQUIVALENCIA ', details: equivalencia});

                                    }
                                }
                                log.debug({title: 'equivalencia ', details: equivalencia});
                                var loaditem1 = record.load({
                                    type: equivalencia,
                                    id: Iditem1,
                                    isDynamic: true,
                                })

                                PriceAssembly.push( loaditem1.getValue({fieldId: 'lastpurchaseprice'}) )
                                log.debug({title: 'loaditem1.getValue({fieldId: lastpurchaseprice})  ', details: loaditem1.getValue({fieldId: 'lastpurchaseprice'}) });
                            }
                            log.audit({title:'ItemsAssembly<<<<<<',details:ItemsAssembly});
                            for(var iteracion4 =0 ;iteracion4< ItemsAssembly.length;iteracion4++){
                                log.audit({title:'iteracion4<<<<<<',details:iteracion4});
                                var pedi1 = record_now.getSublistValue({
                                    sublistId: sublista,
                                    fieldId: 'custcol_efx_ped_numero_pedimento',
                                    line: i
                                }) || '';
                                var item1 = ItemsAssembly[iteracion4];
                                log.audit({title:'ItemsAssembly[iteracion4]<<<<<<',details:ItemsAssembly[iteracion4]});
                                var cantidad1 = QuantAssembly[iteracion4] * tipoQItem;
                                var costo1 = PriceAssembly[iteracion4];
                                var total1 = parseFloat(costo1) * parseFloat(cantidad1);
                                if(!cantidad1){cantidad1=0}
                                if(!costo1){costo1=0}
                                if(!total1){total1=0}
                                if (pedi1) {
                                    log.audit({title:'pedimentoObj<<<<<<',details:pedimentoObj});
                                    array_pedimentoObj.push({pedimento: pedi1, item: item1,cantidad: cantidad1 , costo: costo1,total: total1 });
                                    log.audit({title: 'array_pedimentoObj 195', details: array_pedimentoObj });
                                }

                            }


                        }else{
                            pedimentoObj.pedimento = record_now.getSublistValue({
                                sublistId: sublista,
                                fieldId: 'custcol_efx_ped_numero_pedimento',
                                line: i
                            }) || '';
                            pedimentoObj.item = record_now.getSublistValue({
                                sublistId: sublista,
                                fieldId: 'item',
                                line: i
                            }) || '';
                            pedimentoObj.cantidad = parseFloat(record_now.getSublistValue({
                                sublistId: sublista,
                                fieldId: campo_cantidad,
                                line: i
                            })) || '';
                            pedimentoObj.costo = parseFloat(record_now.getSublistValue({
                                sublistId: sublista,
                                fieldId: campo_rate,
                                line: i
                            })) || '';
                            pedimentoObj.total = parseFloat(pedimentoObj.costo) * parseFloat(pedimentoObj.cantidad);
                            pedimentoObj.ubicacion = ubicacionLinea;
                            log.audit({title: 'pedimentoObj.pedimento', details: pedimentoObj.pedimento});
                            if (pedimentoObj.pedimento) {
                                array_pedimentoObj.push(pedimentoObj);
                            }
                        }


                    }
                }
                //array_pedimentoObj es un array de objetos que trae un objeto por linea del nuevo record
                //lo de abajo crea un filtro donde en el record de historial coincidan los campos:
                //transaccion relacionada (transaccion de origen), articulo y numero de pedimento
                log.audit({title:'array_pedimentoObj 852',details:array_pedimentoObj});
                var filtros_pedimento = new Array();
                for(var i=0;i<array_pedimentoObj.length;i++){
                    var filtro = [['custrecord_efx_ped_numpedimento',search.Operator.IS,array_pedimentoObj[i].pedimento],'AND',['custrecord_efx_ped_h_item',search.Operator.ANYOF,array_pedimentoObj[i].item],'AND',['custrecord_efx_ped_h_location',search.Operator.ANYOF,array_pedimentoObj[i].ubicacion]];
                    filtros_pedimento.push(filtro);
                    var conteo=i+1;
                    if(conteo<array_pedimentoObj.length){
                        filtros_pedimento.push('OR');
                    }
                }

                log.audit({title:'filtros_pedimento',details:filtros_pedimento});
                var buscaPed = search.create({
                    type:'customrecord_efx_ped_record_history',
                    filters: [
                        ['isinactive',search.Operator.IS,'F']
                        ,'AND',
                        ['custrecord_efx_ped_related_tran',search.Operator.IS,record_now.id]
                        ,'AND',
                        filtros_pedimento
                    ],
                    columns:[
                        search.createColumn({name:'created',sort: search.Sort.DESC}),
                        search.createColumn({name:'custrecord_efx_ped_related_tran'}),
                        search.createColumn({name:'custrecord_efx_ped_h_item'}),
                        search.createColumn({name:'custrecord_efx_ped_h_quantity'}),
                        search.createColumn({name:'custrecord_efx_ped_numpedimento'}),
                        search.createColumn({name:'custrecord_efx_ped_h_pedimento'}),
                        search.createColumn({name:'custrecord_efx_ped_h_item'}),
                        search.createColumn({name:'internalid'}),
                    ],
                });

                log.audit({title:'buscaPed',details:buscaPed});
                var ejecutar_pedimento = buscaPed.run();
                log.audit({title:'ejecutar_pedimento',details:ejecutar_pedimento});
                var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);
                log.audit({title:'resultado_pedimento',details:resultado_pedimento});
                log.audit({title:'resultado_pedimento',details:resultado_pedimento.length});
                //Toma el primer resultado de la busqueda y recorre el array que trae los records de la sublista del
                // nuevo record, en el que coincida checa si la cantidad que tenemos en el historico es menor a la
                // cantidad que trae el record recien insertado
                for(var p=0;p<resultado_pedimento.length;p++){
                    var transaccion_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_related_tran'}) || '';
                    var item_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_h_item'}) || '';
                    var cantidad_busca = parseFloat(resultado_pedimento[p].getValue({name:'custrecord_efx_ped_h_quantity'})) || '';
                    var pedimento_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_numpedimento'}) || '';
                    var pedimentoid_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_h_pedimento'}) || '';
                    var ubicacion_busca = resultado_pedimento[p].getValue({name:'custrecord_efx_ped_h_item'}) || '';
                    var historicoid_busca = resultado_pedimento[p].getValue({name:'internalid'}) || '';
                    var elimina_existe = '';
                    for(var y=0;y<array_pedimentoObj.length;y++){
                        if(pedimento_busca==array_pedimentoObj[y].pedimento && item_busca==array_pedimentoObj[y].item && ubicacion_busca==array_pedimentoObj[y].ubicacion){

                            log.audit({title:'cantidad_busca',details:cantidad_busca});
                            log.audit({title:'array_pedimentoObj[y].cantidad905',details:array_pedimentoObj[y].cantidad});
                            log.audit({title:'total_costo_ped_suma',details:total_costo_ped});
                            var operacion = '';
                            if(recType==record.Type.INVENTORY_ADJUSTMENT){
                                if(array_pedimentoObj[y].cantidad<0){

                                }
                            }
                            //Si la cantidad en el historial para esta combinacion de trasaccion
                            // relacionada(transaccion origen), articulo y numero de pedimento es menor a la
                            // cantidad que se inserto en el nuevo record
                            if(cantidad_busca < array_pedimentoObj[y].cantidad){
                                //la cantidad nueva seria la resta de la cantidad insertada en el nuevo rec. - la
                                // cantidad existente en la linea del historico para esta combinacion de de trasaccion
                                // relacionada(transaccion origen), articulo y numero de pedimento
                                var cantidad_nueva = array_pedimentoObj[y].cantidad - cantidad_busca;
                                //El costo nuevo seria la multiplicacion del costo unitario que trae la linea de
                                // la sublista del record nuevo multiplicada por la cantidad nueva de piezas
                                var total_costo_ped = parseFloat(cantidad_nueva) * parseFloat(array_pedimentoObj[y].costo);
                                log.audit({title:'cantidad_nueva_suma',details:cantidad_nueva});
                                var old_value = actualizaPedimento(cantidad_nueva, total_costo_ped, pedimentoid_busca, 'T');
                                log.audit({title: 'transaccion_busca', details: transaccion_busca});
                                log.audit({title: 'array_pedimentoObj[y]927', details: array_pedimentoObj[y]});
                                log.audit({title: 'pedimentoid_busca', details: pedimentoid_busca});
                                log.audit({title: 'old_value', details: old_value});
                                historicoPedimento(transaccion_busca, array_pedimentoObj[y], pedimentoid_busca, old_value, cantidad_nueva);
                                elimina_existe = y;
                                //suma
                            }
                            if(cantidad_busca > array_pedimentoObj[y].cantidad){
                                //resta
                                var cantidad_nueva = cantidad_busca - array_pedimentoObj[y].cantidad;
                                cantidad_nueva = cantidad_nueva * (-1);
                                log.audit({title:'cantidad_nueva_resta',details:cantidad_nueva});
                                var total_costo_ped = parseFloat(cantidad_nueva) * parseFloat(array_pedimentoObj[y].costo);
                                log.audit({title:'total_costo_ped_resta',details:total_costo_ped});
                                var old_value = actualizaPedimento(cantidad_nueva, total_costo_ped, pedimentoid_busca, 'T');
                                log.audit({title: 'transaccion_busca', details: transaccion_busca});
                                log.audit({title: 'array_pedimentoObj[y]943', details: array_pedimentoObj[y]});
                                log.audit({title: 'pedimentoid_busca', details: pedimentoid_busca});
                                log.audit({title: 'old_value', details: old_value});
                                historicoPedimento(transaccion_busca, array_pedimentoObj[y], pedimentoid_busca, old_value, cantidad_nueva);
                                elimina_existe = y;

                            }
                            elimina_existe = y;
                        }

                        //ver si ponemos otra condicion para demas transacciones
                        if(array_pedimentoObj[y].cantidad<0){
                            elimina_existe = y;
                        }
                    }
                    log.audit({title:'elimina_existe',details:elimina_existe});

                    if(elimina_existe !== '' && elimina_existe >= 0){
                        log.audit({title:'elimina_existe',details:elimina_existe});
                        array_pedimentoObj.splice(elimina_existe,1);
                        log.audit({title:'array_pedimentoObj 963',details:array_pedimentoObj});
                    }
                }
                log.audit({title:'array_pedimentoObj 966',details:array_pedimentoObj});


                //crear nuevos en edicion

                if(array_pedimentoObj.length>0) {

                    var conteoLine = record_now.getLineCount({sublistId: sublista});
                    var array_pedimentos = new Array();
                    var pedimentos_existentes = new Array();

                    var pedimentos_linea = new Array();
                    pedimentos_linea = array_pedimentoObj;
                    array_pedimentos = array_pedimentoObj;

                    // if (pedimentos_linea.length > 0) {
                    //     pedimentos_existentes = buscaPedimentos(pedimentos_linea);
                    //     log.audit({title: 'pedimentos_existentes', details: pedimentos_existentes});
                    // }

                    for (var x = 0; x < array_pedimentos.length; x++) {
                        var ped_master_record = record.create({
                            type: 'customrecord_efx_ped_master_record',
                        });
                        ped_master_record.setValue({
                            fieldId: 'custrecord_efx_ped_number',
                            value: array_pedimentos[x].pedimento
                        });
                        ped_master_record.setValue({
                            fieldId: 'custrecord_exf_ped_location',
                            value: array_pedimentos[x].ubicacion
                        });
                        ped_master_record.setValue({
                            fieldId: 'custrecord_efx_ped_date',
                            value: record_now.getValue({fieldId: 'trandate'})
                        });
                        ped_master_record.setValue({
                            fieldId: 'custrecord_exf_ped_item',
                            value: array_pedimentos[x].item
                        });
                        ped_master_record.setValue({
                            fieldId: 'custrecord_efx_ped_available',
                            value: array_pedimentos[x].cantidad
                        });
                        ped_master_record.setValue({
                            fieldId: 'custrecord_efx_ped_exchange',
                            value: record_now.getValue({fieldId: 'exchangerate'})
                        });
                        ped_master_record.setValue({fieldId: 'custrecord_efx_ped_adnumber', value: 'numeroAduana'});
                        ped_master_record.setValue({fieldId: 'custrecord_efx_ped_adname', value: 'NombreAduana'});
                        ped_master_record.setValue({
                            fieldId: 'custrecord_efx_ped_price',
                            value: array_pedimentos[x].costo
                        });
                        ped_master_record.setValue({
                            fieldId: 'custrecord_efx_ped_eta',
                            value: record_now.getValue({fieldId: 'trandate'})
                        });
                        ped_master_record.setValue({
                            fieldId: 'custrecord_efx_ped_etd',
                            value: record_now.getValue({fieldId: 'trandate'})
                        });
                        ped_master_record.setValue({
                            fieldId: 'custrecord_efx_ped_total',
                            value: array_pedimentos[x].total
                        });
                        var pedimento_id = ped_master_record.save();
                        log.audit({title: 'pedimento_id 1273', details: pedimento_id});

                        var ped_history = record.create({
                            type: 'customrecord_efx_ped_record_history'
                        });
                        ped_history.setValue({fieldId: 'custrecord_efx_ped_related_tran', value: record_now.id});
                        ped_history.setValue({fieldId: 'custrecord_efx_ped_h_item', value: array_pedimentos[x].item});
                        ped_history.setValue({fieldId: 'custrecord_efx_ped_h_location', value: array_pedimentos[x].ubicacion});
                        ped_history.setValue({
                            fieldId: 'custrecord_efx_ped_h_quantity',
                            value: array_pedimentos[x].cantidad
                        });
                        ped_history.setValue({fieldId: 'custrecord_efx_ped_h_oldvalue', value: old_value});
                        ped_history.setValue({
                            fieldId: 'custrecord_efx_ped_newvalue',
                            value: array_pedimentos[x].cantidad
                        });
                        ped_history.setValue({fieldId: 'custrecord_efx_ped_h_pedimento', value: pedimento_id});
                        ped_history.setValue({
                            fieldId: 'custrecord_efx_ped_numpedimento',
                            value: array_pedimentos[x].pedimento
                        });
                        ped_history.save();
                    }

                }

            }

        }

        function validatePedimento(inbShip) {
            var dataReturn = {succes: false, data: {}}
            try {
                var dataPedimento = search.lookupFields({
                   type: search.Type.INBOUND_SHIPMENT,
                   id: inbShip,
                   columns: ['custrecord_efx_ped_inb_pedimento']
                });
                log.debug({title:'dataPedimento', details:dataPedimento});
            } catch (error) {
                log.error({title:'validatePedimento', details:error});
            }
            return dataReturn;
        }

        const actualizaPedimento = (cantidad_ped,total_ped,idPedimentos,edita) =>{
            var ped_master_record = record.load({
                type: 'customrecord_efx_ped_master_record',
                id:idPedimentos
            });
            if(edita=='T'){

                var cantidad_e_ped = parseFloat(ped_master_record.getValue({
                    fieldId: 'custrecord_efx_ped_available',
                }));
                cantidad_ped = cantidad_e_ped + cantidad_ped;

                var total_e_ped = ped_master_record.getValue({
                    fieldId: 'custrecord_efx_ped_total'
                });

                total_ped = parseFloat(total_e_ped) + parseFloat(total_ped);

            }
            log.audit({title:'cantidad_ped',details:cantidad_ped});
            if(cantidad_ped>=0){
                ped_master_record.setValue({
                    fieldId: 'custrecord_efx_ped_available',
                    value: cantidad_ped
                });

                ped_master_record.setValue({
                    fieldId: 'custrecord_efx_ped_total',
                    value: total_ped
                });
                var id_masrte = ped_master_record.save();
            }

            log.audit({title:'actualiza_master',details:id_masrte});
            if(edita=='T'){
                return cantidad_e_ped;
            }

        }

        const historicoPedimento = (id_tran,array_pedimentos,idPedimentos,oldValue,cantidad_nueva) => {

            log.audit({title: 'array_pedimentos.cantidad', details: array_pedimentos.cantidad});
            log.audit({title: 'cantidad_nueva', details: cantidad_nueva});


            var nuevo_valor = parseFloat(oldValue) + parseFloat(cantidad_nueva);
            if (nuevo_valor >= 0 && cantidad_nueva) {
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

                if (cantidad_nueva) {
                    ped_history.setValue({
                        fieldId: 'custrecord_efx_ped_newvalue',
                        value: parseFloat(oldValue) + parseFloat(cantidad_nueva)
                    });
                } else {
                    ped_history.setValue({
                        fieldId: 'custrecord_efx_ped_newvalue',
                        value: parseFloat(array_pedimentos.cantidad) + parseFloat(oldValue)
                    });
                }

                ped_history.setValue({fieldId: 'custrecord_efx_ped_h_pedimento', value: idPedimentos});
                ped_history.setValue({
                    fieldId: 'custrecord_efx_ped_numpedimento',
                    value: array_pedimentos.pedimento
                });
                var crea_h = ped_history.save();
                log.audit({title: 'crea_historico', details: crea_h});
            }

            if (!cantidad_nueva) {
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

                if (cantidad_nueva) {
                    ped_history.setValue({
                        fieldId: 'custrecord_efx_ped_newvalue',
                        value: parseFloat(oldValue) + parseFloat(cantidad_nueva)
                    });
                } else {
                    ped_history.setValue({
                        fieldId: 'custrecord_efx_ped_newvalue',
                        value: parseFloat(array_pedimentos.cantidad) + parseFloat(oldValue)
                    });
                }

                ped_history.setValue({fieldId: 'custrecord_efx_ped_h_pedimento', value: idPedimentos});
                ped_history.setValue({
                    fieldId: 'custrecord_efx_ped_numpedimento',
                    value: array_pedimentos.pedimento
                });
                var crea_h = ped_history.save();
                log.audit({title: 'crea_historico', details: crea_h});
            }


        }

        const buscaPedimentos = (pedimentos_linea) => {

            var filtros_pedimento = new Array();
            for(var i=0;i<pedimentos_linea.length;i++){
                var filtro = [['custrecord_efx_ped_number',search.Operator.IS,pedimentos_linea[i].pedimento],'AND',['custrecord_exf_ped_item',search.Operator.ANYOF,pedimentos_linea[i].item]];
                filtros_pedimento.push(filtro);
                var conteo=i+1;
                if(conteo<pedimentos_linea.length){
                    filtros_pedimento.push('OR');
                }
            }
            log.audit({title:'filtros_pedimento',details:filtros_pedimento});

            var buscaPed = search.create({
                type:'customrecord_efx_ped_master_record',
                filters: [
                    ['isinactive',search.Operator.IS,'F']
                    ,'AND',
                    filtros_pedimento
                ],
                columns:[
                    search.createColumn({name:'custrecord_efx_ped_number'}),
                    search.createColumn({name:'custrecord_exf_ped_item'}),
                    search.createColumn({name:'custrecord_efx_ped_available'}),
                    search.createColumn({name:'custrecord_efx_ped_total'}),
                    search.createColumn({name:'internalid'}),
                ]
            });

            var ejecutar_pedimento = buscaPed.run();
            var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);

            log.audit({title:'resultado_pedimento',details:resultado_pedimento});

            var arregloBusqueda = new Array();
            for(var x=0;x<resultado_pedimento.length;x++){
                var searchPedimentos = {
                    numeroPedimento:'',
                    articuloPedimento:'',
                    cantidadDisponible:'',
                    totalPedimento:'',
                    id:''
                }
                searchPedimentos.numeroPedimento = resultado_pedimento[x].getValue({name:'custrecord_efx_ped_number'}) || '';
                searchPedimentos.articuloPedimento = resultado_pedimento[x].getValue({name:'custrecord_exf_ped_item'}) || '';
                searchPedimentos.cantidadDisponible = resultado_pedimento[x].getValue({name:'custrecord_efx_ped_available'}) || '';
                searchPedimentos.totalPedimento = resultado_pedimento[x].getValue({name:'custrecord_efx_ped_total'}) || '';
                searchPedimentos.id = resultado_pedimento[x].getValue({name:'internalid'}) || '';
                arregloBusqueda.push(searchPedimentos);
            }

            return arregloBusqueda;
        }

        const consultaPedimentos = (cantidad_ped, idPedimentos) =>{

            log.audit({title:'cantidad_ped',details:cantidad_ped});
            log.audit({title:'idPedimentos',details:idPedimentos});
            var ped_master_record = record.load({
                type: 'customrecord_efx_ped_master_record',
                id:idPedimentos
            });

            var cantidad_e_ped = parseFloat(ped_master_record.getValue({
                fieldId: 'custrecord_efx_ped_available',
            }));
            cantidad_ped = cantidad_e_ped + cantidad_ped;
            log.audit({title:'cantidad_ped-bf',details:cantidad_ped});
            if(cantidad_ped<0){
                throw 'La cantidad ingresada es mayor a la cantidad disponible en stock, favor de verificar su disponibilidad de stock';
            }


        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
