/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @file Evita que el usuario guarde un record de tipo Invoice, Vendor Credit o Inventory adjustment con un numero
 * mayor al stock disponible de pedimentos
 */
define(['N/currentRecord', 'N/search','N/record','N/ui/message'],
/**
 * @param{currentRecord} currentRecord
 * @param{search} search
 */
function(currentRecord, search,record,message) {


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
        console.log('scriptContext');
        console.log(JSON.stringify(scriptContext));
        var objRecord = currentRecord.get();
        console.log('objRecord');
        console.log(JSON.stringify(objRecord));
        var recType = objRecord.type;

        if (recType == record.Type.INVOICE || recType == record.Type.VENDOR_CREDIT) {
            sublista = 'item';
            campo_cantidad = 'quantity';
            campo_rate = 'rate';
        }

        if (recType == record.Type.INVENTORY_ADJUSTMENT) {
            sublista = 'inventory';
            campo_cantidad = 'adjustqtyby';
            campo_rate = 'unitcost';
        }

        var numLines = objRecord.getLineCount({
            sublistId: sublista
        });

        var array_items = new Array();

        var suma_cantidad = 0;
        var suma_pedimento = '';
        for(var i=0;i<numLines;i++){
            var contiene_ped = objRecord.getSublistValue({
                sublistId: sublista,
                fieldId: 'custcol_efx_ped_contains',
                line: i
            });

            console.log(contiene_ped)

            if(contiene_ped) {
            console.log('tiene ped')
                var items = objRecord.getSublistValue({
                    sublistId: sublista,
                    fieldId: 'item',
                    line: i
                });

                var cantidad_campo = parseFloat(objRecord.getSublistValue({
                    sublistId: sublista,
                    fieldId: campo_cantidad,
                    line: i
                }));

                var pedimento_campo = objRecord.getSublistValue({
                    sublistId: sublista,
                    fieldId: 'custcol_efx_ped_numero_pedimento',
                    line: i
                });
                suma_pedimento = suma_pedimento + pedimento_campo;
                suma_cantidad = suma_cantidad + cantidad_campo;

                array_items.push(items);
            }
        }
        console.log(suma_pedimento);
        console.log(suma_cantidad);

        if (recType == record.Type.INVOICE || recType == record.Type.VENDOR_CREDIT || (suma_cantidad<0 && suma_pedimento==='')) {
            suma_cantidad = suma_cantidad * (-1);
            var dataItem = [];
            for (var z = 0; z < array_items.length; z++) {

                if (dataItem.indexOf(array_items[z]) == -1) {
                    dataItem.push(array_items[z]);
                }
            }

            console.log(dataItem);

            if(dataItem.length>0) {

                var buscaPed = search.create({
                    type: 'customrecord_efx_ped_master_record',
                    filters: [
                        ['isinactive', search.Operator.IS, 'F']
                        , 'AND',
                        ['custrecord_efx_ped_available', search.Operator.ISNOT, '0.0']
                        , 'AND',
                        ['custrecord_exf_ped_item', search.Operator.ANYOF, dataItem]
                    ],
                    columns: [
                        search.createColumn({name: 'custrecord_efx_ped_available'}),
                        search.createColumn({name: 'internalid'}),
                    ],
                });


                var ejecutar_pedimento = buscaPed.run();

                var resultado_pedimento = ejecutar_pedimento.getRange(0, 100);
                var stok_total = 0;
                for (var x = 0; x < resultado_pedimento.length; x++) {
                    var cantidad_av = parseFloat(resultado_pedimento[x].getValue({name: 'custrecord_efx_ped_available'})) || 0;
                    stok_total = stok_total + cantidad_av;
                }
                console.log(stok_total);
                console.log(suma_cantidad);
                if (suma_cantidad <= stok_total) {
                    return true;
                } else {
                    var falta = suma_cantidad - stok_total;
                    var myMsg = message.create({
                        title: "Pedimentos",
                        message: 'Por favor asegurese de que tenga stock disponible en sus pedimentos.\nStock Disponible: ' + stok_total + '.' + '\nCantidad solicitada en la transaccion: ' + suma_cantidad + '. Se necesita un stock adicional de ' + falta + ' unidades.',
                        type: message.Type.ERROR
                    });
                    myMsg.show();
                    return false;
                }
            }else{
                return true;
            }
        }else{
            return true;
        }

    }

    return {

        saveRecord: saveRecord
    };
    
});
