/**
 * Event handler for point click events.
 * @param {Object} event - The event object containing the click event.
 * @param {Object} dataBinding - The data binding object containing the data.
 * @param {Array} dimensions - Array of dimension objects.
 * @param {Object} widget - Reference to the widget ('this', in context).
 */
export function handlePointClick(event, dataBinding, dimensions, widget) {
    const point = event.target;
    console.log('Point clicked:', point);
    if (!point) {
        console.error('Point is undefined');
        return;
    }

    const dimension = dimensions[0];
    const dimensionKey = dimension.key;
    const dimensionId = dimension.id;
    const label = point.to || 'No Label';
    console.log('Dimension key:', dimensionKey);
    console.log('Dimension ID:', dimensionId);
    console.log('Label:', label);

    const selectedItem = dataBinding.data.find(
        (item) => item[dimensionKey].label === label
    );
    console.log('Selected item:', selectedItem);

    const linkedAnalysis = widget.dataBindings.getDataBinding('dataBinding').getLinkedAnalysis();

    if (widget._selectedPoint && widget._selectedPoint !== point) {
        linkedAnalysis.removeFilters();
        widget._selectedPoint.select(false, false);
        widget._selectedPoint = null;
    }

    if (event.type === 'select') {
        if (selectedItem) {
            const selection = {};
            selection[dimensionId] = selectedItem[dimensionKey].id;
            console.log('Selection:', selection);
            console.log('selection[dimensionId]:', selection[dimensionId]);
            console.log('selectedItem[dimensionKey].id', selectedItem[dimensionKey].id);
            linkedAnalysis.setFilters(selection);
            widget._selectedPoint = point;
        }
    } else if (event.type === 'unselect') {
        linkedAnalysis.removeFilters();
        widget._selectedPoint = null;
    }
}
