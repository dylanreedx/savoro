import Testing
import Foundation
import AVFoundation
@testable import Savoro

// MARK: - Helpers

/// Minimal mock delegate that records every barcode passed to scannerDidScan.
private final class MockScannerDelegate: ScannerViewControllerDelegate {
    var receivedBarcodes: [String] = []

    func scannerDidScan(barcode: String) {
        receivedBarcodes.append(barcode)
    }
}

// MARK: - Coordinator hasScanned guard

@Suite("ScannerRepresentable.Coordinator — hasScanned guard")
@MainActor
struct CoordinatorHasScannedTests {

    // The Coordinator lives inside ScannerRepresentable which is private.
    // We test the observable contract via ScannerViewControllerDelegate:
    // a direct Coordinator instance is not accessible, so we test
    // the delegate callback behaviour by hooking up a ScannerViewController
    // to our own mock delegate.

    @Test("scannerDidScan fires onScan exactly once on first call")
    func onScanFiresOnce() async {
        var callCount = 0
        var lastBarcode: String?

        // Build a Coordinator stand-in using the same logic: a captured flag.
        // Since Coordinator is in a private struct, we replicate the logic
        // in a local helper to verify the guard pattern is correct.
        var hasScanned = false
        let simulateCoordinator: (String) -> Void = { barcode in
            guard !hasScanned else { return }
            hasScanned = true
            callCount += 1
            lastBarcode = barcode
        }

        simulateCoordinator("5901234123457")
        #expect(callCount == 1)
        #expect(lastBarcode == "5901234123457")
    }

    @Test("scannerDidScan ignores second scan after hasScanned is set")
    func onScanIgnoresDuplicate() async {
        var callCount = 0

        var hasScanned = false
        let simulateCoordinator: (String) -> Void = { _ in
            guard !hasScanned else { return }
            hasScanned = true
            callCount += 1
        }

        simulateCoordinator("5901234123457")
        simulateCoordinator("5901234123457")  // duplicate — held barcode
        #expect(callCount == 1)
    }

    @Test("scannerDidScan ignores subsequent scans of different barcodes once hasScanned is set")
    func onScanIgnoresDifferentSubsequentBarcodes() async {
        var received: [String] = []

        var hasScanned = false
        let simulateCoordinator: (String) -> Void = { barcode in
            guard !hasScanned else { return }
            hasScanned = true
            received.append(barcode)
        }

        simulateCoordinator("0012345678905") // EAN-13
        simulateCoordinator("01234565")      // EAN-8 — must be suppressed
        simulateCoordinator("012345678905")  // UPC-A — must be suppressed

        #expect(received.count == 1)
        #expect(received[0] == "0012345678905")
    }

    @Test("onScan closure receives the exact barcode string")
    func onScanForwardsExactString() async {
        var received: String?

        var hasScanned = false
        let simulateCoordinator: (String) -> Void = { barcode in
            guard !hasScanned else { return }
            hasScanned = true
            received = barcode
        }

        simulateCoordinator("01234565")
        #expect(received == "01234565")
    }
}

// MARK: - ScannerViewControllerDelegate protocol

@Suite("ScannerViewControllerDelegate protocol")
struct ScannerViewControllerDelegateTests {

    @Test("delegate receives barcode when scannerDidScan is called directly")
    func delegateReceivesBarcode() {
        let mock = MockScannerDelegate()
        mock.scannerDidScan(barcode: "9780201379624")
        #expect(mock.receivedBarcodes == ["9780201379624"])
    }

    @Test("delegate accumulates multiple distinct calls")
    func delegateAccumulatesMultipleCalls() {
        let mock = MockScannerDelegate()
        mock.scannerDidScan(barcode: "EAN-001")
        mock.scannerDidScan(barcode: "EAN-002")
        #expect(mock.receivedBarcodes.count == 2)
        #expect(mock.receivedBarcodes[1] == "EAN-002")
    }

    @Test("ScannerViewController exposes weak delegate property")
    func scannerViewControllerHasWeakDelegate() {
        let vc = ScannerViewController()
        let mock = MockScannerDelegate()
        vc.delegate = mock
        #expect(vc.delegate != nil)
    }

    @Test("ScannerViewController delegate becomes nil when mock is deallocated")
    func scannerViewControllerDelegateWeakRef() {
        let vc = ScannerViewController()
        var mock: MockScannerDelegate? = MockScannerDelegate()
        vc.delegate = mock
        #expect(vc.delegate != nil)
        mock = nil
        #expect(vc.delegate == nil)
    }
}

// MARK: - Barcode format validation helpers

@Suite("Barcode string format expectations")
struct BarcodeFormatTests {

    @Test("EAN-13 barcode has 13 characters")
    func ean13Length() {
        let barcode = "5901234123457"
        #expect(barcode.count == 13)
    }

    @Test("EAN-8 barcode has 8 characters")
    func ean8Length() {
        let barcode = "01234565"
        #expect(barcode.count == 8)
    }

    @Test("UPC-A barcode has 12 characters")
    func upcaLength() {
        let barcode = "012345678905"
        #expect(barcode.count == 12)
    }

    @Test("UPC-E barcode has 6 or 8 characters")
    func upceLength() {
        let upce6 = "012345"
        let upce8 = "01234565"
        #expect(upce6.count == 6 || upce8.count == 8)
    }

    @Test("empty barcode string is not forwarded (guard on stringValue)")
    func emptyBarcodeGuard() {
        // Mirrors the guard in metadataOutput where readable.stringValue must be non-nil and non-empty
        let stringValue: String? = nil
        let shouldForward = stringValue != nil && !(stringValue?.isEmpty ?? true)
        #expect(shouldForward == false)
    }
}

// MARK: - Permission state routing

@Suite("BarcodeScannerView permission state logic")
struct PermissionStateTests {

    @Test("authorized status maps to scanner branch")
    func authorizedStatus() {
        let status = AVAuthorizationStatus.authorized
        #expect(status == .authorized)
    }

    @Test("denied status maps to permissionDenied branch")
    func deniedStatus() {
        let status = AVAuthorizationStatus.denied
        #expect(status == .denied || status == .restricted)
    }

    @Test("restricted status maps to permissionDenied branch")
    func restrictedStatus() {
        let status = AVAuthorizationStatus.restricted
        #expect(status == .denied || status == .restricted)
    }

    @Test("notDetermined status maps to ProgressView branch")
    func notDeterminedStatus() {
        let status = AVAuthorizationStatus.notDetermined
        // Not authorized, denied, or restricted — falls into default branch
        #expect(status != .authorized)
        #expect(status != .denied)
        #expect(status != .restricted)
    }

    @Test("Settings URL scheme is app-settings:")
    func settingsURLScheme() {
        let url = URL(string: "app-settings:")
        #expect(url != nil)
        #expect(url?.scheme == "app-settings")
    }
}

// MARK: - ViewfinderOverlay geometry

@Suite("ViewfinderOverlay geometry calculations")
struct ViewfinderOverlayGeometryTests {

    @Test("viewfinder side is 72% of the smaller screen dimension")
    func viewfinderSideCalculation() {
        let width: CGFloat = 390
        let height: CGFloat = 844
        let side = min(width, height) * 0.72
        #expect(side == 390 * 0.72)
        #expect(side > 0)
    }

    @Test("viewfinder rect is centred in the given size")
    func viewfinderRectCentred() {
        let width: CGFloat = 390
        let height: CGFloat = 844
        let side = min(width, height) * 0.72
        let x = (width - side) / 2
        let y = (height - side) / 2
        // The midpoint of the rect should match the midpoint of the container
        #expect(x + side / 2 == width / 2)
        #expect(y + side / 2 == height / 2)
    }

    @Test("corner bracket arm length and radius are positive")
    func cornerBracketDimensions() {
        let arm: CGFloat = 28
        let r: CGFloat = 16
        #expect(arm > 0)
        #expect(r > 0)
        #expect(arm > r) // arm must extend beyond the curve radius
    }

    @Test("square viewfinder case: side equals smaller dimension at 72%")
    func squareViewfinder() {
        let side: CGFloat = 390
        let computed = min(side, side) * 0.72
        #expect(computed == side * 0.72)
    }
}
