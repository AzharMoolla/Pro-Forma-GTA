// Apache ECharts 6.1.0, tree-shaken to what the app draws. Loaded on demand (EChart.tsx) so it stays out of the first bundle.
import { BarChart, HeatmapChart, LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, LegendComponent, MarkLineComponent, TitleComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'

echarts.use([BarChart, LineChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, VisualMapComponent, AriaComponent, TitleComponent, SVGRenderer])

export const init = (el: HTMLElement) => echarts.init(el, undefined, { renderer: 'svg' })
