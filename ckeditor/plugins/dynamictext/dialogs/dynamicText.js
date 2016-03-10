CKEDITOR.dialog.add('dynamicTextDialog', function(editor) {
  return {
    title: 'Dynamic Text Properties',
    minWidth: 400,
    minHeight: 200,
    contents: [{
      id: 'tab-basic',
      label: '',
      elements: [{
        type: 'text',
        id: 'data-name',
        label: 'Dynamic Text Name',
        validate: CKEDITOR.dialog.validate.notEmpty('Dynamic Text name cannot be empty.'),
        setup: function(element) {
          this.setValue(element.getAttribute('data-name'));
        }
      },
      {
        type: 'text',
        id: 'data-desc',
        label: 'Description',
        setup: function(element) {
          this.setValue(element.getAttribute('data-desc'));
        }
      }]
    }],

    onShow: function() {
      var selection = editor.getSelection();
      var element = selection.getStartElement();
      if (element) {
        if (element.getName() != 'div') {
          element = element.getParent();
        }
        if (element.getName() != 'div') {
          this.insertMode = true;
        } else {
          this.insertMode = false;
          this.element = element;
          this.setupContent(this.element);
        }
      } else {
        this.insertMode = true;
      }
    },
    onOk: function() {
      var dialog = this;
      var chart = editor.document.createElement('div');
      var id;
      var name = dialog.getValueOf('tab-basic', 'data-name');
      var desc = dialog.getValueOf('tab-basic', 'data-desc');

      chart.appendHtml('<img src="/ckeditor/genericplaceholder/textplaceholder.png" style="height:25px; width:100px" />');
      if (this.insertMode) {
        id = counter++;
      } else {
        id = this.element.getAttribute('data-id');
      }
      chart.setAttribute('data-id', id);
      chart.setAttribute('data-name', name);
      chart.setAttribute('data-desc', desc);
      chart.setAttribute('data-type', 'dynamicText');
      editor.insertElement(chart);
    }
  };
});
