import AVFoundation
import SwiftUI

// MARK: - BarcodeScannerView

struct BarcodeScannerView: View {
    let onScan: (String) -> Void
    let onDismiss: () -> Void

    @State private var cameraPermission: AVAuthorizationStatus = .notDetermined

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            switch cameraPermission {
            case .authorized:
                ScannerRepresentable(onScan: onScan)
                    .ignoresSafeArea()

                ViewfinderOverlay()

            case .denied, .restricted:
                permissionDeniedView

            default:
                // .notDetermined — request on appear
                ProgressView()
                    .tint(.white)
            }

            // Close button
            VStack {
                HStack {
                    Spacer()
                    Button {
                        onDismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    .padding(.trailing, 20)
                    .padding(.top, 12)
                }
                Spacer()
            }
        }
        .statusBarHidden()
        .onAppear {
            checkPermission()
        }
    }

    // MARK: - Permission

    private func checkPermission() {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        cameraPermission = status

        if status == .notDetermined {
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    cameraPermission = granted ? .authorized : .denied
                }
            }
        }
    }

    private var permissionDeniedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.fill")
                .font(.system(size: 40))
                .foregroundStyle(SavoroColors.rose)

            Text("Camera Access Required")
                .font(SavoroFonts.headline)
                .foregroundStyle(.white)

            Text("Open Settings to allow Savoro to use the camera for scanning barcodes.")
                .font(SavoroFonts.subheadline)
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Link(destination: URL(string: "app-settings:")!) {
                Text("Open Settings")
                    .font(SavoroFonts.callout)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(SavoroColors.rose, in: Capsule())
            }
        }
    }
}

// MARK: - ScannerRepresentable

private struct ScannerRepresentable: UIViewControllerRepresentable {
    let onScan: (String) -> Void

    func makeUIViewController(context: Context) -> ScannerViewController {
        let vc = ScannerViewController()
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ uiViewController: ScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onScan: onScan)
    }

    // MARK: Coordinator

    final class Coordinator: NSObject, ScannerViewControllerDelegate {
        let onScan: (String) -> Void
        private var hasScanned = false

        init(onScan: @escaping (String) -> Void) {
            self.onScan = onScan
        }

        func scannerDidScan(barcode: String) {
            guard !hasScanned else { return }
            hasScanned = true

            Task { @MainActor in
                HapticManager.shared.success()
                onScan(barcode)
            }
        }
    }
}

// MARK: - ScannerViewControllerDelegate

protocol ScannerViewControllerDelegate: AnyObject {
    func scannerDidScan(barcode: String)
}

// MARK: - ScannerViewController

final class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    weak var delegate: ScannerViewControllerDelegate?

    private let captureSession = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "com.savoro.scanner.session")
    private var previewLayer: AVCaptureVideoPreviewLayer?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureSession()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        sessionQueue.async { [weak self] in
            guard let self, !self.captureSession.isRunning else { return }
            self.captureSession.startRunning()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        sessionQueue.async { [weak self] in
            guard let self, self.captureSession.isRunning else { return }
            self.captureSession.stopRunning()
        }
    }

    // MARK: - Session Configuration

    private func configureSession() {
        // Simulator guard
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            return
        }

        sessionQueue.async { [weak self] in
            guard let self else { return }

            self.captureSession.beginConfiguration()
            defer { self.captureSession.commitConfiguration() }

            guard let input = try? AVCaptureDeviceInput(device: device),
                  self.captureSession.canAddInput(input) else { return }
            self.captureSession.addInput(input)

            let metadataOutput = AVCaptureMetadataOutput()
            guard self.captureSession.canAddOutput(metadataOutput) else { return }
            self.captureSession.addOutput(metadataOutput)

            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.ean13, .ean8, .upce, .upca]

            DispatchQueue.main.async {
                let layer = AVCaptureVideoPreviewLayer(session: self.captureSession)
                layer.videoGravity = .resizeAspectFill
                layer.frame = self.view.bounds
                self.view.layer.addSublayer(layer)
                self.previewLayer = layer
            }

            self.captureSession.startRunning()
        }
    }

    // MARK: - AVCaptureMetadataOutputObjectsDelegate

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard let readable = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let barcode = readable.stringValue else { return }

        sessionQueue.async { [weak self] in
            self?.captureSession.stopRunning()
        }

        delegate?.scannerDidScan(barcode: barcode)
    }
}

// MARK: - Preview

#Preview {
    BarcodeScannerView(onScan: { _ in }, onDismiss: {})
}
