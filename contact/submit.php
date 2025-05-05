<?php
$recaptcha_secret = '6LfOOi8rAAAAAElwJgHx-cMRx8xt1uvTV9-YRS5U'; // Your reCAPTCHA v3 secret

// Verify reCAPTCHA
$token = $_POST['g-recaptcha-response'] ?? '';
$action = $_POST['action'] ?? '';

$verifyResponse = file_get_contents("https://www.google.com/recaptcha/api/siteverify", false, stream_context_create([
  'http' => [
    'method' => 'POST',
    'header' => "Content-type: application/x-www-form-urlencoded\r\n",
    'content' => http_build_query([
      'secret' => $recaptcha_secret,
      'response' => $token,
      'remoteip' => $_SERVER['REMOTE_ADDR']
    ])
  ]
]));

$responseData = json_decode($verifyResponse);

if (
  !$responseData->success ||
  $responseData->score < 0.5 ||
  $responseData->action !== 'gig_form'
) {
  echo json_encode(['success' => false, 'message' => 'reCAPTCHA verification failed.']);
  exit;
}

// Continue with normal form processing
$name = htmlspecialchars($_POST['name'] ?? '');
$email = htmlspecialchars($_POST['email'] ?? '');
$phone = htmlspecialchars($_POST['phone'] ?? '');
$date = htmlspecialchars($_POST['date'] ?? '');
$message = htmlspecialchars($_POST['message'] ?? '');

if (!$name || !$email || !$phone || !$date || !$message) {
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit;
}

$to = 'davidpassmore+giginquiry@gmail.com';
$subject = "New Gig Inquiry from $name";
$body = "Name: $name\nEmail: $email\nPhone: $phone\nDate: $date\n\nMessage:\n$message";
$headers = "From: $email\r\nReply-To: $email\r\n";

if (mail($to, $subject, $body, $headers)) {
    echo json_encode(['success' => true, 'message' => 'Your inquiry has been sent.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to send email.']);
}
?>
