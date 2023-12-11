/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @author Nicolás Castillo
 * @copyright Efficientix
 * @file Script aplicado a inbound shipment para validar y manejar el pedimento dentro del formulario
 */
define(['N/currentRecord', 'N/log', 'N/record', 'N/search'],
/**
 * @param{currentRecord} currentRecord
 * @param{log} log
 * @param{record} record
 */
function(currentRecord, log, record, search) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        var inbship_rec	 = scriptContext.currentRecord;
        // var no_pos = inbship_rec.getLineCount({
        //     sublistId:	   'items'
        // });
        // //Probar esto para ver si asi podemos poner la aduana de la OC en el inbound
        // log.audit({title: 'Se encontro  ' + no_pos + ' orden de compra', details: ''});



    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

        var inb_rec = scriptContext.currentRecord;

        //Leer el pedimento y llenar los campos necesarios
        if(scriptContext.fieldId == 'custrecord_efx_ped_inb_pedimento') {

            var pedimento = inb_rec.getValue('custrecord_efx_ped_inb_pedimento');
            //Remove leading and trailing spaces
            var pedimento_sintraillead = pedimento.trim();
            //log.audit({title: 'Pedimeno sin trailed', details: pedimento_sintraillead});
            //Remove spaces/format
            var pedimento_sinespacio = pedimento_sintraillead.replace(/\s/g, '');

            //log.audit({title: 'Lenght de pedimento', details: pedimento_sinespacio.length});
            //If pedimento is entered both with or without format it will evaluate to true as long as it is
            // 15 characters long
            if(pedimento_sinespacio.length == 15){
                //Save each part of pedimento in separately
                    //Save 1st 2 chars (Año de validacion)
                    var anio_ped = pedimento_sinespacio.substring(0,2);
                    //log.audit({title: 'Año del pedimento', details: anio_ped});
                    //save numbers 3 and 4(Aduana) of 15 digit string (pedimento)
                    var adua_ped = pedimento_sinespacio.substring(2,4);
                    //log.audit({title: 'Aduana del pedimento', details: adua_ped});
                    //save numbers 5,6,7,8 (Patente) of 15 digit string (pedimento)
                    var pate_ped = pedimento_sinespacio.substring(4,8);
                    //log.audit({title: 'Patente del pedimento', details: pate_ped});
                    var numprogr_ped = pedimento_sinespacio.substring(8,15);
                    //log.audit({title: 'Numeracion prograsiva por aduana', details: numprogr_ped});
                    //Reconstructing official formatting for pedimento
                    var pedConFormato = anio_ped + '  ' + adua_ped + '  ' + pate_ped + '  ' + numprogr_ped;
                    //log.audit({title: 'Pedimento con formato', details: pedConFormato});

                //Set value for Clave SAT field
                inb_rec.setValue('custrecord_efx_ped_inb_clavesat', pedConFormato)
                //Set value for Aduana field
                //Here we need to go into the cust record aduanas (TBC) to get the name of the aduana
                //Since we don't have the internalid netsuite gave to the record matching our Codigo SAT aduana, we
                // need to do a search first to retrieve the internalid of NS and then load that record

                inb_rec.setValue('custrecord_efx_ped_inb_aduana', adua_ped)

                // var buscaidaduana = search.create({
                //     type:'customrecord_efx_ped_aduanas',
                //     filters: [
                //         ['isinactive',search.Operator.IS,'F']
                //         ,'AND',
                //         ['custrecord_efx_ped_ad_id_sat',search.Operator.IS,adua_ped]
                //     ],
                //     columns:[
                //         search.createColumn({name:'internalid'}),
                //         search.createColumn({name:'name'})
                //     ],
                // });
                //
                // var ejecutar_busqueda = buscaidaduana.run();
                // var resultado_busqueda = ejecutar_busqueda.getRange(0, 100);
                // //log.audit({title:'resultado_pedimento',details:resultado_busqueda});
                // //log.audit({title:'resultado_pedimento',details:resultado_busqueda.length});
                //
                // //Solo tratar de obtener el internalid de la aduana en caso de que exista (traiga resultados la
                // // busqueda)
                // if(resultado_busqueda.length > 0){
                //     var id_rec_aduana = resultado_busqueda[0].getValue({name:'internalid'});
                //     var nom_aduana = resultado_busqueda[0].getValue({name:'name'});
                //
                //     var adua_idsatynom = adua_ped + ' - ' + nom_aduana;
                //     inb_rec.setValue('custrecord_efx_ped_inb_aduana', adua_idsatynom)
                // }else{
                //     inb_rec.setValue('custrecord_efx_ped_inb_clavesat', '')
                //     inb_rec.setValue('custrecord_efx_ped_inb_aduana', '')
                //     alert('Pedimento incorrecto: No existe la aduana ' + adua_ped + ' en el catálogo del SAT,' +
                //         ' verifique el pedimento.');
                // }



            }else{
                alert('El numero de pedimento no es valido')

            }

        }


    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    //contSubline es una var global para controlar que solo corra 1 vez el codigo dentro
    contSubline = 0;
    function sublistChanged(scriptContext) {

        if(contSubline === 0){

            if (sublistName == 'items') {

                var inbship_rec	 = scriptContext.currentRecord;
                var sublistName = scriptContext.sublistId;
                log.audit({title: 'SE CAMBIO LA SUBLISTA' + sublistName, details: ''});
                //log.audit({title: 'EL CONTEXT TRAE: ', details: scriptContext});

                var poID = inbship_rec.getSublistValue({
                    sublistId: 'items',
                    fieldId: 'purchaseorder',
                    line: 0
                });

                log.audit({title: 'El id de la OC agregada es: ' + poID, details: ''});

                var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    filters:
                        [
                            ["type","anyof","PurchOrd"],
                            "AND",
                            ["internalid","anyof",poID],
                            "AND",
                            ["mainline","is","T"]
                        ],
                    columns:
                        [
                            search.createColumn({name: "custbody_efx_ped_ad_po", label: "Aduana - Pedimento"})
                        ]
                });
                var searchResultCount = purchaseorderSearchObj.runPaged().count;
                //log.debug("purchaseorderSearchObj result count",searchResultCount);
                purchaseorderSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    var idAduanaPO = result.getValue('custbody_efx_ped_ad_po');
                    log.audit({title: 'ID de la aduana en la OC ' + idAduanaPO, details: ''});
                    inbship_rec.setValue('custrecord_efx_ped_inb_aduana', idAduanaPO);
                    //return true to continue running loop
                    return true;
                });
                contSubline++;
            }

        }

        return true;

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {





    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
        var inbship_rec	 = scriptContext.currentRecord;
        var sublistName = scriptContext.sublistId;


        //CUBRE EL ESCENARIO DE AGREGAR UNA PO INDIVIDUAL A NIVEL DE LINEA

        var no_pos = inbship_rec.getLineCount({
                 sublistId:	   'items'
             });

        //Solo correr esto cuando el countline de la sublista sea 0 o 1

        if(no_pos === 0){
             if (sublistName == 'items') {

                var poID = inbship_rec.getCurrentSublistValue({
                    sublistId: 'items',
                    fieldId: 'purchaseorder',
                });

                log.audit({title: 'El id de la OC agregada es: ' + poID, details: ''});

                var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    filters:
                        [
                            ["type","anyof","PurchOrd"],
                            "AND",
                            ["internalid","anyof",poID],
                            "AND",
                            ["mainline","is","T"]
                        ],
                    columns:
                        [
                            search.createColumn({name: "custbody_efx_ped_ad_po", label: "Aduana - Pedimento"})
                        ]
                });
                var searchResultCount = purchaseorderSearchObj.runPaged().count;
                log.debug("purchaseorderSearchObj result count",searchResultCount);
                purchaseorderSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    var idAduanaPO = result.getValue('custbody_efx_ped_ad_po');
                    log.audit({title: 'ID de la aduana en la OC ' + idAduanaPO, details: ''});
                    inbship_rec.setValue('custrecord_efx_ped_inb_aduana', idAduanaPO);
                    //return true to continue running loop
                    return true;
                });

            }



        }
        return true;
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

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

    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        // lineInit: lineInit,
        //validateField: validateField
         validateLine: validateLine
        // validateInsert: validateInsert,
        // validateDelete: validateDelete,
        // saveRecord: saveRecord
    };
    
});
