/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @author Nicolás Castillo
 * @copyright Efficientix
 * @file Before record has been loaded: Populates the relevant values on the P.O. based on the originating Envio de
 * Muestra record. After record has been submited to DB: It goes back to the originating Envio de muestra record and
 * sets the id of this P.O.
 * @deployed Purchase Order
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

            var po_rec = scriptContext.newRecord;
            //Get the ID of the Envio de muestra record this P.O. is coming from
            var id_rec_envmuestra = po_rec.getValue('custbody_efx_ped_tran_env');
            //If it's coming from a Envio de muestra custom record then set the corresponding values on the P.O.
            if(id_rec_envmuestra){
                var env_muestra_vals = set_enviodemuestra(po_rec, id_rec_envmuestra);
                log.audit({title: env_muestra_vals, details: ''});
            }

        }

        /**
         * Sets the fields on the PO to match the ones of the Envio de Muestra record the PO was created from.
         * @param {record} po_rec Contains record object
         * @param {number} id_rec_envmuestra Contains id of envio de muestra record the P.O. was created from.
         * @returns {(string|Array)} [item_muestra, qty_muestra, ubicacion_muestra, subsidiaria]
         */

        function set_enviodemuestra(po_rec, id_rec_envmuestra){
            var datos_envmuestra = search.lookupFields({
                type: 'customrecord_efx_envio_muestra',
                id: id_rec_envmuestra,
                columns: ['custrecord_efx_muestra', 'custrecord_efx_remo_ubicacioenvio','custrecord_efx_remo_muestractd','custrecord_efx_proveedor', 'custrecordefx_ped_envmues_subs']
            });

            var item_muestra = datos_envmuestra.custrecord_efx_muestra[0].value;
            var ubicacion_muestra = datos_envmuestra.custrecord_efx_remo_ubicacioenvio[0].value;
            var qty_muestra = datos_envmuestra.custrecord_efx_remo_muestractd;
            var vend_muestra = datos_envmuestra.custrecord_efx_proveedor[0].value;
            var subsidiaria = datos_envmuestra.custrecordefx_ped_envmues_subs[0].value;

            //log.audit({title: 'Contenido de datos env muestra', details: datos_envmuestra});

            po_rec.setValue('entity', vend_muestra);
            po_rec.setValue('location', ubicacion_muestra);
            po_rec.setValue('subsidiary', subsidiaria);
            po_rec.setSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: 0,
                value: item_muestra
            });
            po_rec.setSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: 0,
                value: qty_muestra
            });
            //We need to return the following values in case they are needed to do an inventory adjustment:
            //Item, qty, location
            return [item_muestra, qty_muestra, ubicacion_muestra, subsidiaria];
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
            var new_po_rec = scriptContext.newRecord;
            //Gets the id of new P.O. record
            var newpo_rec_id = new_po_rec.id;
            log.audit({title: 'ID OF NEW PO: ' + newpo_rec_id, details: ''});
            //Gets id of originating envio muestra record
            var orig_envmues_rec_id = new_po_rec.getValue('custbody_efx_ped_tran_env');
            log.audit({title: 'ID OF ORIGINATING ENVIO MUESTRA REC: ' + orig_envmues_rec_id, details: ''});

            //Set the related po record field in envio muestra record only  if this po came from one
            if(orig_envmues_rec_id){
                //Set PO relacionada field on originating envio muestra record
                record.submitFields({
                    type: 'customrecord_efx_envio_muestra',
                    id: orig_envmues_rec_id,
                    values: {
                        'custrecord_efx_ped_rel_po': newpo_rec_id
                    }
                });
            }


        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
