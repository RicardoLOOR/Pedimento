/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @author Nicolás Castillo
 * @copyright Efficientix
 * @file Creates a negative inventory adjustment if we are shipping one of our inventory parts as a sample
 * @deployed Envío de Muestra (customrecord_efx_envio_muestra)
 */
define(['N/log', 'N/record', 'N/search', 'N/transaction'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{search} search
 * @param{transaction} transaction
 */
    (log, record, search, transaction) => {
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
            //IF we are creating an invadj record then...
            if (scriptContext.type == scriptContext.UserEventType.CREATE) {
                var env_new_rec = scriptContext.newRecord;
                //Check if the producto especial checkbox is true or false
                var producto_especial = env_new_rec.getValue('custrecord_efx_producto_especial');
                //If this part is accounted for then create a negative inventory adjustment
                if(!producto_especial){
                    //Create a new negative inventory adjustment for sample item
                    //Get relevant fields to use in inventory adj transaction
                    var subs = env_new_rec.getValue('custrecordefx_ped_envmues_subs');
                    var item = env_new_rec.getValue('custrecord_efx_muestra');
                    var location = env_new_rec.getValue('custrecord_efx_remo_ubicacioenvio');
                    var qty = env_new_rec.getValue('custrecord_efx_remo_muestractd');
                    //Get the adjustment account from configuration record
                    var bus_ped_conf_muest = search.lookupFields({
                        type: 'customrecord_efx_ped_config_muestras',
                        id: 1,
                        columns: ['custrecord_efx_ped_cta_ajuste']
                    });
                    var adj_acct = bus_ped_conf_muest.custrecord_efx_ped_cta_ajuste[0].value;

                    log.audit({title: 'Se crearia un ajuste de inventario con estos datos:', details: ''});
                    log.audit({title:subs , details: ''});
                    log.audit({title:item , details: ''});
                    log.audit({title:location , details: ''});
                    log.audit({title: qty, details: ''});
                    log.audit({title:adj_acct , details: ''});

                    //Create negative inventory adjustment for this item.
                    var id_invadjrec = neg_invent_adj(subs, adj_acct, item, location, qty);
                    //Set the Documento de salida field to the id of the inv. adjustment
                    env_new_rec.setValue('custrecord_efx_transaccion', id_invadjrec);
                }

            }


        }

        /**
         * Creates a new negative inventory adjustment record based on the values from the muestra envio record.
         * @param {integer} subs Contains id of subsidiary to be used for inventory adjustment
         * @param {integer} adj_acct Contains the id of the adjustment account to be used
         * @param {integer} item Contains the id of the item
         * @param {integer} location Contains the id of the location
         * @param {integer} qty Contains qty for item
         * @returns {integer} invadjnewrec_id Returns ic of inventory adjustment record
         */
        function neg_invent_adj(subs, adj_acct, item, location, qty){
            var newRec = record.create({
                type: record.Type.INVENTORY_ADJUSTMENT,
                isDynamic: false
            });
            //Set main body fields
            newRec.setValue({
                fieldId: "subsidiary",
                value: subs,
                ignoreFieldChange: false
            });
            newRec.setValue({
                fieldId: "account",
                value: adj_acct,
                ignoreFieldChange: false
            });
            //Set item id
            newRec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'item',
                line: 0,
                value: item
            });
            //Set negative qty
            newRec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'adjustqtyby',
                line: 0,
                value: -qty
            });
            //Set location
            newRec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'location',
                line: 0,
                value: location
            });
            //Set contiene pedimentos checkbox to false
            newRec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'custcol_efx_ped_contains',
                line: 0,
                value: false
            });

            var invadjnewrec_id = newRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });
            //Return id of new inventory adjustment record
            return invadjnewrec_id;

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

        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
