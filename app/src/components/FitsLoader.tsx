import type { EmpiricalSpectrumPoint } from "./EmpiricalSpectrum"
import { Input } from "@/components/ui/input"
import { FITS } from "fits2js"
import { type ChangeEvent, useMemo, useState } from "react"
import { EmpiricalSpectrum } from "./EmpiricalSpectrum"

type LoadingState = "waiting" | "processing" | "finished" | "error"

export function FitsLoader({ plotColor }: { plotColor: string }) {
  const [loadingState, setLoadingState] = useState<LoadingState>("waiting")
  const [fits, setFits] = useState<FITS | null>(null)

  const loadedData = useMemo((): EmpiricalSpectrumPoint[] | null => {
    if (!fits) {
      return null
    }

    // This code takes the first row of the data and maps it to a JSON object
    // with the pixel and intensity values. It does it like this because there
    // are some FITS files that have more than one row of data, but taking the
    // first row is enough for now.
    return Array.from(fits.getData().take(fits.NAXISn[0])).map(
      ({ coordinates, value }) => ({ pixel: coordinates[0], intensity: value }),
    )
  }, [fits])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const file = event.target.files[0]
      setLoadingState("processing")
      const reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = () => {
        if (reader.result) {
          try {
            const result = FITS.fromBuffer(reader.result as ArrayBuffer, null)
            setFits(result)
            setLoadingState("finished")
          }
          catch (error) {
            console.error("Error al parsear el JSON:", error)
            setLoadingState("error")
          }
        }
      }
      reader.onerror = () => {
        console.error("Error al leer el archivo")
        setLoadingState("error")
      }
    }
  }

  return (
    <div className="my-2">
      <div className="flex items-center">
        <Input
          type="file"
          onChange={handleFileChange}
          accept=".fit,.fits"
          className="w-min"
        />
        {loadingState === "finished"
          ? (
              <p className="ml-4">
                {
                  [
                    fits?.getHeader("DATE-OBS")?.trim(),
                    fits?.getHeader("TELESCOP")?.trim(),
                    fits?.getHeader("INSTRUME")?.trim(),
                    fits?.getHeader("OBSERVER")?.trim(),
                    fits?.getHeader("OBJECT")?.trim(),
                    fits?.getHeader("EQUINOX"),
                    fits?.getHeader("EPOCH"),
                  ].filter(Boolean).join(" /// ")
                }
              </p>
            )
          : loadingState === "error"
            ? <p className="text-red-500">Error al cargar el archivo</p>
            : null}
      </div>
      {loadingState === "processing" && <p>Cargando contenido...</p>}
      {loadedData && <EmpiricalSpectrum data={loadedData} color={plotColor} />}
    </div>
  )
}
