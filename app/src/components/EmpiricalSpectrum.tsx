import { useMeasure } from "@/hooks/use-measure"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { curveLinear } from "@visx/curve"
import { GridColumns, GridRows } from "@visx/grid"
import { Group } from "@visx/group"
import { scaleLinear } from "@visx/scale"
import { Circle, LinePath } from "@visx/shape"
import * as d3 from "@visx/vendor/d3-array"
import { useMemo, useState } from "react"

export interface EmpiricalSpectrumPoint {
  pixel: number
  intensity: number
}

// data accessors
const getX = (p: EmpiricalSpectrumPoint) => p?.pixel ?? 0
const getY = (p: EmpiricalSpectrumPoint) => p?.intensity ?? 0

const height = 300
const margin = { top: 40, right: 30, bottom: 50, left: 55 }

export function EmpiricalSpectrum({ data, color }: { data: EmpiricalSpectrumPoint[], color: string }) {
  const { xScale, yScale } = useMemo(() => {
    return {
      data,
      xScale: scaleLinear<number>({ domain: [0, d3.max(data, getX)!] }),
      yScale: scaleLinear<number>({ domain: [0, d3.max(data, getY)!] }),
    }
  }, [data])

  // bounds
  const [measureRef, measured] = useMeasure<HTMLDivElement>()
  const width = measured.width ?? 0
  const xMax = Math.max(width - margin.left - margin.right, 0)
  const yMax = Math.max(height - margin.top - margin.bottom, 0)

  // update scale output ranges
  xScale.range([0, xMax])
  yScale.range([yMax, 0])

  // Point logic
  const [clickPosition, setClickPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  function onClick(event: React.MouseEvent<SVGSVGElement>) {
    const svgRect = event.currentTarget.getBoundingClientRect()

    // clic X relativo al SVG
    const xClick = event.clientX - svgRect.left - margin.left

    const xVal = xScale.invert(xClick)
    const yMatch = data[Math.round(xVal) - 1]
    if (yMatch) {
      const yVal = (height - margin.bottom) - (height - margin.bottom - margin.top - yScale(yMatch.intensity))
      setClickPosition({ x: xClick, y: yVal })
    }
  }

  return (
    <div ref={measureRef}>
      <svg width={width} height={height} onClick={onClick}>
        <Circle
          cx={clickPosition.x + margin.left}
          cy={clickPosition.y}
          r={4}
          fill="red"
        />
        <Group top={margin.top} left={margin.left}>
          <GridColumns
            scale={xScale}
            width={xMax}
            height={yMax}
            className="stroke-neutral-100"
          />
          <GridRows
            scale={yScale}
            width={xMax}
            height={yMax}
            className="stroke-neutral-100"
          />
          <LinePath<EmpiricalSpectrumPoint>
            curve={curveLinear}
            data={data}
            x={p => xScale(getX(p)) ?? 0}
            y={p => yScale(getY(p)) ?? 0}
            shapeRendering="geometricPrecision"
            className="stroke-1"
            style={{ stroke: color }}
          />
          <AxisBottom
            scale={xScale}
            top={yMax}
            label="Pixel"
            numTicks={Math.floor(xMax / 80)}
          />
          <AxisLeft scale={yScale} label="Intensity" />
        </Group>
      </svg>
    </div>
  )
}