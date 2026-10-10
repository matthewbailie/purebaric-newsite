import Foundation
import Quartz
let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let doc = PDFDocument(url: url)!
for i in 0..<doc.pageCount {
  let page = doc.page(at: i)!
  let bounds = page.bounds(for: .mediaBox)
  let scale: CGFloat = 1.6
  let img = NSImage(size: NSSize(width: bounds.width*scale, height: bounds.height*scale))
  img.lockFocus()
  NSColor.white.set(); NSRect(x:0,y:0,width:bounds.width*scale,height:bounds.height*scale).fill()
  let ctx = NSGraphicsContext.current!.cgContext
  ctx.scaleBy(x: scale, y: scale)
  page.draw(with: .mediaBox, to: ctx)
  img.unlockFocus()
  let tiff = img.tiffRepresentation!
  let rep = NSBitmapImageRep(data: tiff)!
  let png = rep.representation(using: .png, properties: [:])!
  try! png.write(to: URL(fileURLWithPath: "\(args[2])-\(i+1).png"))
}
print("pages", doc.pageCount)
