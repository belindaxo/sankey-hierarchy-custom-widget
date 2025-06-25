import * as Highcharts from 'highcharts';
import 'highcharts/modules/sankey';

/**
 * Parses metadata into structured dimensions and measures.
 * @param {Object} metadata - The metadata object from SAC data binding.
 * @returns {Object} An object containing parsed dimensions, measures, and their maps.
 */
var parseMetadata = metadata => {
    const { dimensions: dimensionsMap, mainStructureMembers: measuresMap } = metadata;
    const dimensions = [];
    for (const key in dimensionsMap) {
        const dimension = dimensionsMap[key];
        dimensions.push({ key, ...dimension });
    }

    const measures = [];
    for (const key in measuresMap) {
        const measure = measuresMap[key];
        measures.push({ key, ...measure });
    }
    return { dimensions, measures, dimensionsMap, measuresMap };
}

(function () {
    class SankeyHierarchy extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });

            this.nodes = [];
            this.links = [];

            // Create a CSSStyleSheet for the shadow DOM
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(`
                @font-face {
                    font-family: '72';
                    src: url('../fonts/72-Regular.woff2') format('woff2');
                }
                #container {
                    width: 100%;
                    height: 100%;
                    font-family: '72';
                }
            `);

            // Apply the stylesheet to the shadow DOM
            this.shadowRoot.adoptedStyleSheets = [sheet];

            // Add the container for the chart
            this.shadowRoot.innerHTML = `
                <div id="container"></div>    
            `;
        }

        /**
         * Called when the widget is resized.
         * @param {number} width - New width of the widget.
         * @param {number} height - New height of the widget.
         */
        onCustomWidgetResize(width, height) {
            this._renderChart();
        }

        /**
         * Called after widget properties are updated.
         * @param {Object} changedProperties - Object containing changed attributes.
         */
        onCustomWidgetAfterUpdate(changedProperties) {
            this._renderChart();
        }

        /**
         * Called when the widget is destroyed. Cleans up chart instance.
         */
        onCustomWidgetDestroy() {
            if (this._chart) {
                this._chart.destroy();
                this._chart = null;
            }
        }

        /**
         * Specifies which attributes should trigger re-rendering on change.
         * @returns {string[]} An array of observed attribute names.
         */
        static get observedAttributes() {
            return [
                'chartTitle', 'titleSize', 'titleFontStyle', 'titleAlignment', 'titleColor',                // Title properties
                'chartSubtitle', 'subtitleSize', 'subtitleFontStyle', 'subtitleAlignment', 'subtitleColor', // Subtitle properties
                'scaleFormat', 'decimalPlaces',                                                             // Number formatting properties
                'isInverted', "linkColorMode"                                                               // Sankey chart properties
            ];
        }

        /**
        * Called when an observed attribute changes.
        * @param {string} name - The name of the changed attribute.
        * @param {string} oldValue - The old value of the attribute.
        * @param {string} newValue - The new value of the attribute.
        */
        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue) {
                this[name] = newValue;
                this._renderChart();
            }
        }



        /**
         * Renders the chart using the provided data and metadata.
         */
        _renderChart() {
            const dataBinding = this.dataBinding;
            if (!dataBinding || dataBinding.state !== 'success' || !dataBinding.data || dataBinding.data.length === 0) {
                if (this._chart) {
                    this._chart.destroy();
                    this._chart = null;
                }
                return;
            }
            console.log('dataBinding:', dataBinding);
            const { data, metadata } = dataBinding;
            const { dimensions, measures } = parseMetadata(metadata);

            if (dimensions.length === 0 || measures.length === 0) {
                if (this._chart) {
                    this._chart.destroy();
                    this._chart = null;
                }
                return;
            }

            const [dimension] = dimensions;
            const [measure] = measures;
            
            // Reset nodes and links
            this.nodes = [];
            this.links = [];

            console.log('data:', data);
            console.log('metadata:', metadata);
            console.log('dimensions:', dimensions);
            console.log('measures:', measures);
            console.log('dimension:', dimension)
            console.log('measure:', measure);


            const scaleFormat = (value) => this._scaleFormat(value);
            const subtitleText = this._updateSubtitle();



            data.forEach(row => {
                const { label, id, parentId } = row[dimension.key];
                const { raw } = row[measure.key];
                this.nodes.push({ name: label });

                const rowParent = data.find(d => {
                    const { id } = d[dimension.key];
                    return id === parentId;
                });
                if (rowParent) {
                    const { label: parentLabel } = rowParent[dimension.key];
                    this.links.push({
                        from: parentLabel,
                        to: label,
                        value: raw
                    });
                }
            });

            const formattedNodes = this.nodes.map(node => ({
                id: node.name,
                name: node.name,
                ...(node.color && { color: node.color }), // Only include color if it exists
            }));
            const formattedData = this.links.map(link => ({
                from: link.from,
                to: link.to,
                weight: link.value,
            }));

            console.log('formattedNodes:', formattedNodes);
            console.log('formattedData:', formattedData);

            console.log('nodes:', this.nodes);
            console.log('links:', this.links);

            Highcharts.setOptions({
                lang: {
                    thousandsSep: ','
                },
                colors: ['#004b8d', '#939598', '#faa834', '#00aa7e', '#47a5dc', '#006ac7', '#ccced2', '#bf8028', '#00e4a7']
            });

            const chartOptions = {
                chart: {
                    type: 'sankey',
                    style: {
                        fontFamily: "'72', sans-serif"
                    },
                    inverted: this.isInverted || false
                },
                title: {
                    text: this.chartTitle || "",
                    align: this.titleAlignment || "left",
                    style: {
                        fontSize: this.titleSize || "16px",
                        fontWeight: this.titleFontStyle || "bold",
                        color: this.titleColor || "#004B8D",
                    },
                },
                subtitle: {
                    text: subtitleText,
                    align: this.subtitleAlignment || "left",
                    style: {
                        fontSize: this.subtitleSize || "11px",
                        fontStyle: this.subtitleFontStyle || "normal",
                        color: this.subtitleColor || "#000000",
                    },
                },
                credits: {
                    enabled: false
                },
                tooltip: {
                    headerFormat: null,
                    pointFormatter: this._formatTooltipPoint(scaleFormat),
                    nodeFormatter: this._formatTooltipNode(scaleFormat),
                },
                series: [{
                    keys: ['from', 'to', 'weight'],
                    nodes: formattedNodes,
                    data: formattedData,
                    type: 'sankey',
                    linkColorMode: this.linkColorMode || 'from',
                }]
            };
            this._chart = Highcharts.chart(this.shadowRoot.getElementById('container'), chartOptions);
        }

        /**
         * 
         * @param {Function} scaleFormat - A function to scale and format the value.
         * @returns {Function} A function that formats the tooltip for the point.
         */
        _formatTooltipPoint(scaleFormat) {
            return function () {
                console.log(this);
                if (this) {
                    const { scaledValue, valueSuffix } = scaleFormat(this.weight);
                    const value = Highcharts.numberFormat(scaledValue, -1, '.', ',');
                    const valueWithSuffix = `${value} ${valueSuffix}`;
                    const fromNodeName = this.from;
                    const toNodeName = this.to;
                    return `
                        ${fromNodeName} \u2192 ${toNodeName}: ${valueWithSuffix}
                    `;
                } else {
                    return 'Error with data';
                }
            }
        }

        /**
         * 
         * @param {Function} scaleFormat - A function to scale and format the value.
         * @returns {Function} A function that formats the tooltip for the node.
         */
        _formatTooltipNode(scaleFormat) {
            return function () {
                if (this) {
                    const { scaledValue, valueSuffix } = scaleFormat(this.sum);
                    const value = Highcharts.numberFormat(scaledValue, -1, '.', ',');
                    const valueWithSuffix = `${value} ${valueSuffix}`;
                    const name = this.name;
                    return `
                        ${name}: ${valueWithSuffix}
                    `;
                } else {
                    return 'Error with data';
                }
            }
        }

        /**
         * Determines subtitle text based on scale format or user input.
         * @returns {string} The subtitle text.
         */
        _updateSubtitle() {
            if (!this.chartSubtitle || this.chartSubtitle.trim() === '') {
                let subtitleText = '';
                switch (this.scaleFormat) {
                    case 'k':
                        subtitleText = 'in k';
                        break;
                    case 'm':
                        subtitleText = 'in m';
                        break;
                    case 'b':
                        subtitleText = 'in b';
                        break;
                    default:
                        subtitleText = '';
                        break;
                }
                return subtitleText;
            } else {
                return this.chartSubtitle;
            }
        }

        _scaleFormat(value) {
            let scaledValue = value;
            let valueSuffix = '';

            switch (this.scaleFormat) {
                case 'k':
                    scaledValue = value / 1000;
                    valueSuffix = 'k';
                    break;
                case 'm':
                    scaledValue = value / 1000000;
                    valueSuffix = 'm';
                    break;
                case 'b':
                    scaledValue = value / 1000000000;
                    valueSuffix = 'b';
                    break;
                default:
                    break;
            }
            return {
                scaledValue: scaledValue.toFixed(this.decimalPlaces),
                valueSuffix
            };
        }

        // SAC scripting methods

        getNodes() {
            return this.nodes;
        }

        getLinks() {
            return this.links;
        }
    }
    customElements.define('com-sap-sample-sankey-hierarchy', SankeyHierarchy);
})();