 ;(function(Form) {

   /**
    * @germangonzo
    *  Modified to support bootstrap inline radio
    *  TODO: Move to editors
    */
   Form.editors.InlineRadio = Form.editors.Radio.extend({
     tagName: 'div',
     /**
      * Create the radio list HTML
      * @param {Array}   Options as a simple array e.g. ['option1', 'option2']
      *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
      * @return {String} HTML
      */
     _arrayToHtml: function(array) {
       var html = [];
       var self = this;

       _.each(array, function(option, index) {
         var itemHtml = '';
         var val = option;
         var label = option;
         if (_.isObject(option)) {
           val = (option.val || option.val === 0) ? option.val : '';
           label = option.label || val;
         }
         itemHtml += ('<label class="radio inline" for="' + self.id + '-' + index + '">' + label);
         itemHtml += ('<input type="radio" name="' + self.id + '" value="' + val + '" id="' + self.id + '-' + index + '" />');
         itemHtml += ('</label>');

         html.push(itemHtml);
       });

       return html.join('');
     }
   });

 })(Backbone.Form);