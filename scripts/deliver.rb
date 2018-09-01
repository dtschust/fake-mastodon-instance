require 'http'
require 'openssl'

document      = File.read('follow-request.json')
date          = Time.now.utc.httpdate
keypair       = OpenSSL::PKey::RSA.new(File.read('private.pem'))
signed_string = "(request-target): post /inbox\nhost: xoxo.zone\ndate: #{date}"
signature     = Base64.strict_encode64(keypair.sign(OpenSSL::Digest::SHA256.new, signed_string))
header        = 'keyId="https://toot.rip/users/nuncamind",headers="(request-target) host date",signature="' + signature + '"'

puts header

response = HTTP.headers({ 'Host': 'xoxo.zone', 'Date': date, 'Signature': header })
    .post('https://xoxo.zone/inbox', body: document)

puts response.status
puts response.body
