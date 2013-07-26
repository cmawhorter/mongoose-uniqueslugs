
exports.enhanceSchema = function(schema, options)
{
  if (!schema || typeof schema.add == 'undefined') throw new Error('Invalid Schema');

  options = options || {};

  options.source = options.source || 'title';
  options.target = options.target || 'slug';
  // Everything except letters and digits becomes a dash. All modern browsers are
  // fine with UTF8 characters in URLs. If you don't like this, pass your own regexp
  // to match disallowed characters
  options.disallow = options.disallow || /[^\w\d]+/g;
  options.substitute = options.substitute || '-';

  if (!options.addSlugManually)
  {
    var slugDef = {};
    slugDef[options.target] = { type: String, unique: true };
    schema.add(slugDef);
  }
console.log(options);
  // compile
  var esc_sub = options.substitute.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // regex escapes options.substitute
    , re_trim = new RegExp('^('+esc_sub+')+|('+esc_sub+')+$', 'g'); // regex to remove leading/trailing occurences of options.substitute
  schema.method('generateSlug', function() {
    console.log('using', blah, options)
    var source = this.get(options.source);
    return source.toLowerCase().replace(options.disallow, options.substitute).replace(re_trim, '');
  });

  schema.method('_slugKey', function() {
    return options.target;
  });

  // "Wait, how does the slug become unique?" See enhanceModel below. We add digits to it
  // if and only if there is an actual error on save. This approach is concurrency safe
  // unlike the usual "hope nobody else makes a slug while we're still saving" strategy
  schema.pre('save', function (next) {
    this.set(options.target, this.generateSlug());
    next();
  });
};

exports.enhanceModel = function(model)
{
  if (!model || typeof model.prototype == 'undefined' || typeof model.prototype.save == 'undefined') throw new Error('Invalid Model');

  // Stash the original 'save' method so we can call it
  model.prototype.saveAfterExtendSlugOnUniqueIndexError = model.prototype.save;
  // Replace 'save' with a wrapper
  model.prototype.save = function(f)
  {
    var self = this
      , slugKey = self._slugKey();
    // Our replacement callback
    var extendSlugOnUniqueIndexError = function(err, d)
    {
      if (err)
      {
        // Spots unique index errors relating to the slug field
        if ((err.code === 11000) && (err.err.indexOf(slugKey) !== -1))
        {
          self[slugKey] += (Math.floor(Math.random() * 10)).toString();
          // Necessary because otherwise Mongoose doesn't allow us to retry save(),
          // at least until https://github.com/punkave/mongoose/commit/ea37acc8bd216abec68033fe9e667afa5fd9764c
          // is in the mainstream release
          self.isNew = true;
          self.save(extendSlugOnUniqueIndexError);
          return;
        }
      }
      // Not our special case so call the original callback
      f(err, d);
    };
    // Call the original save method, with our wrapper callback
    self.saveAfterExtendSlugOnUniqueIndexError(extendSlugOnUniqueIndexError);
  }
};
