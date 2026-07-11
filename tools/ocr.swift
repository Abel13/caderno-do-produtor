import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count == 2 else {
    fputs("Uso: ocr.swift <imagem>\n", stderr)
    exit(2)
}

let path = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: path),
      let data = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: data),
      let cgImage = bitmap.cgImage else {
    fputs("Não foi possível abrir: \(path)\n", stderr)
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["pt-BR", "en-US"]
request.automaticallyDetectsLanguage = true

do {
    try VNImageRequestHandler(cgImage: cgImage).perform([request])
    let observations = (request.results ?? []).sorted {
        let lineDelta = abs($0.boundingBox.midY - $1.boundingBox.midY)
        if lineDelta > 0.012 { return $0.boundingBox.midY > $1.boundingBox.midY }
        return $0.boundingBox.minX < $1.boundingBox.minX
    }
    for observation in observations {
        if let candidate = observation.topCandidates(1).first {
            print(candidate.string)
        }
    }
} catch {
    fputs("Falha no OCR de \(path): \(error)\n", stderr)
    exit(1)
}
