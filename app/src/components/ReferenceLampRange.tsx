import type { SpectrumPoint } from "@/lib/spectral-data"
import { useGlobalStore } from "@/hooks/use-global-store"
import { useMeasure } from "@/hooks/use-measure"
import { getMaterialSpectralData } from "@/lib/spectral-data"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { curveLinear } from "@visx/curve"
import { GridColumns, GridRows } from "@visx/grid"
import { Group } from "@visx/group"
import { PatternLines } from "@visx/pattern"
import { scaleLinear } from "@visx/scale"
import { LinePath } from "@visx/shape"
import * as d3 from "@visx/vendor/d3-array"
import { useId, useMemo } from "react"

// data accessors
const getX = (p: SpectrumPoint) => p?.wavelength ?? 0
const getY = (p: SpectrumPoint) => p?.intensity ?? 0

const height = 150
const margin = { top: 40, right: 30, bottom: 50, left: 55 }

export function ReferenceLampRange() {
  const patternId = useId()
  const material = useGlobalStore(s => s.material)
  const [rangeMin, setRangeMin] = useGlobalStore(s => [
    s.rangeMin,
    s.setRangeMin,
  ])
  const [rangeMax, setRangeMax] = useGlobalStore(s => [
    s.rangeMax,
    s.setRangeMax,
  ])

  const { data, xScale, yScale } = useMemo(() => {
    const data = getMaterialSpectralData(material)
    return {
      data,
      xScale: scaleLinear<number>({ domain: [0, d3.max(data, getX)!] }),
      yScale: scaleLinear<number>({ domain: [0, d3.max(data, getY)!] }),
    }
  }, [material])

  // bounds
  const [measureRef, measured] = useMeasure<HTMLDivElement>()
  const width = measured.width ?? 0
  const xMax = Math.max(width - margin.left - margin.right, 0)
  const yMax = Math.max(height - margin.top - margin.bottom, 0)

  // update scale output ranges
  xScale.range([0, xMax])
  yScale.range([yMax, 0])

  return (
    <div ref={measureRef}>
      <svg width={width} height={height}>
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
          <LinePath<SpectrumPoint>
            curve={curveLinear}
            data={data}
            x={p => xScale(getX(p)) ?? 0}
            y={p => yScale(getY(p)) ?? 0}
            strokeWidth={1}
            strokeOpacity={1}
            shapeRendering="geometricPrecision"
            className="stroke-primary"
          />
          <AxisBottom
            scale={xScale}
            top={yMax}
            label="Wavelength (Å)"
            numTicks={Math.floor(xMax / 80)}
          />
          <AxisLeft scale={yScale} label="Intensity" numTicks={4} />

          <PatternLines
            id={patternId}
            height={8}
            width={8}
            strokeWidth={1}
            orientation={["diagonal"]}
            className="stroke-neutral-300"
          />

          <Group left={0}>
            <rect
              width={xScale(rangeMin)}
              height={yMax}
              className="stroke-0 pointer-events-none"
              fill={`url(#${patternId})`}
            />
            <ResizeHandler
              left={xScale(rangeMin)}
              height={yMax}
              onMove={(dx) => {
                const newMin
                  = rangeMin + Math.sign(dx) * xScale.invert(Math.abs(dx))
                if (
                  newMin >= xScale.domain()[0]
                  && xScale(rangeMax) - xScale(newMin) >= 20
                ) {
                  // Update only if there are at least 20 pixels between the two thumbs.
                  setRangeMin(newMin)
                }
              }}
            />
          </Group>

          <Group left={xScale(rangeMax)}>
            <rect
              width={xMax - xScale(rangeMax)}
              height={yMax}
              className="stroke-0 pointer-events-none"
              fill={`url(#${patternId})`}
            />
            <ResizeHandler
              left={0}
              height={yMax}
              onMove={(dx) => {
                const newMax
                  = rangeMax + Math.sign(dx) * xScale.invert(Math.abs(dx))
                if (
                  newMax <= xScale.domain()[1]
                  && xScale(newMax) - xScale(rangeMin) >= 20
                ) {
                  // Update only if there are at least 20 pixels between the two thumbs.
                  setRangeMax(newMax)
                }
              }}
            />
          </Group>
        </Group>
      </svg>
    </div>
  )
}

function ResizeHandler({
  height,
  left,
  onMove,
}: {
  height: number
  left: number
  onMove?: (dx: number) => void
}) {
  const pathWidth = 8
  const pathHeight = 15

  return (
    <Group
      left={left}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement
        target.setPointerCapture(event.pointerId)
        // Prevent browser focus behaviour because we focus a thumb manually when values change.
        event.preventDefault()
      }}
      onPointerMove={(event) => {
        const target = event.target as HTMLElement
        if (target.hasPointerCapture(event.pointerId)) {
          const dx
            = event.clientX - (target.getBoundingClientRect().x + pathWidth / 2)
          onMove?.(dx)
        }
      }}
      onPointerUp={(event) => {
        const target = event.target as HTMLElement
        if (target.hasPointerCapture(event.pointerId)) {
          target.releasePointerCapture(event.pointerId)
        }
      }}
    >
      <line
        x1={0}
        x2={0}
        y1={0}
        y2={height}
        className="stroke-1 stroke-neutral-700"
      />
      <Group left={0} top={(height - pathHeight) / 2}>
        <path
          d="M -4.5 0.5 L 3.5 0.5 L 3.5 15.5 L -4.5 15.5 L -4.5 0.5 M -1.5 4 L -1.5 12 M 0.5 4 L 0.5 12"
          className="cursor-ew-resize fill-neutral-50 stroke-1 stroke-neutral-400"
        />
      </Group>
    </Group>
  )
}